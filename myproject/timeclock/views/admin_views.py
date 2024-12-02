#Admin Login Section
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from ..models import Employee, TimeEntry, Note
from django.db.models import Prefetch, Case, When, Value, BooleanField
from collections import defaultdict, OrderedDict
from django.utils.http import url_has_allowed_host_and_scheme

def admin_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None and user.is_staff:
            login(request, user)
            # Validate the next_url to prevent open redirects
            next_url = request.POST.get('next', '')
            if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
                return redirect(next_url)
            else:
                return redirect('admin_dashboard')
        else:
            return render(request, 'admin_login.html', {'error': 'Invalid credentials or not an admin.'})
    
    # If the request is GET, pass the 'next' parameter if it exists
    next_url = request.GET.get('next', '')
    return render(request, 'admin_login.html', {'next': next_url})

#Admin Dashboards and Views
@login_required
def admin_dashboard(request):
    if not request.user.is_staff:
        return redirect('admin_login')

    # Get the list of employees (this should be cached or prefetched if used elsewhere)
    employees = Employee.objects.all().order_by('first_name')

    # Get filter values from the request
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_name = request.GET.get('employee_name')

    # Set timezone
    tz = pytz.timezone('America/New_York')

    # Calculate date range
    if not start_date or not end_date:
        today = timezone.now().date()
        current_weekday = today.weekday()

        # Calculate the start and end of the week
        if current_weekday >= 3:
            start_of_week = today - timedelta(days=current_weekday - 3)
        else:
            start_of_week = today - timedelta(days=current_weekday + 4)
        end_of_week = start_of_week + timedelta(days=6)
        start_date = datetime.combine(start_of_week, datetime.min.time())
        end_date = datetime.combine(end_of_week, datetime.max.time())
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        end_date = datetime.combine(end_date, datetime.max.time())

    start_date = tz.localize(start_date)
    end_date = tz.localize(end_date)

    # Filter time entries based on the date range and employee (if provided)
    time_entries = TimeEntry.objects.filter(
        clock_in_time__gte=start_date,
        clock_in_time__lte=end_date
    ).select_related('employee').prefetch_related(
        Prefetch('notes', queryset=Note.objects.select_related('created_by').order_by('created_at'))
    ).annotate(
        is_clocked_in=Case(
            When(clock_out_time__isnull=True, then=Value(True)),
            default=Value(False),
            output_field=BooleanField()
        )
    ).order_by(
        '-is_clocked_in',  # Clocked-in entries first
        'employee__last_name',  # Then sort by employee name
        '-clock_in_time'  # Then sort by date (newest first)
    )

    # Filter by employee name if provided
    if employee_name:
        time_entries = time_entries.filter(employee_id=employee_name)

    # Process each time entry for display
    for entry in time_entries:
        clock_in_time_local = entry.clock_in_time.astimezone(tz) if entry.clock_in_time else None
        clock_out_time_local = entry.clock_out_time.astimezone(tz) if entry.clock_out_time else None

        if clock_in_time_local:
            entry.clock_in_time_formatted = clock_in_time_local.strftime('%I:%M %p')
            entry.clock_in_time_formatted_date = clock_in_time_local.strftime('%a, %m/%d/%y')
        else:
            entry.clock_in_time_formatted = ''
            entry.clock_in_time_formatted_date = ''

        if clock_out_time_local:
            duration = clock_out_time_local - clock_in_time_local
            entry.hours_worked_formatted = "{}H {}M".format(int(duration.total_seconds() // 3600), int((duration.total_seconds() % 3600) // 60))
            entry.clock_out_time_formatted = clock_out_time_local.strftime('%I:%M %p')
        else:
            entry.hours_worked_formatted = ""
            entry.clock_out_time_formatted = 'Clocked In'

        # Prepare notes for display
        entry.notes_display = [
            f"<small>{get_creator_name(note.created_by)}</small>: {note.note_text}"
            for note in entry.notes.all()
        ]

    return render(request, 'admin_dashboard.html', {
        'employees': employees,
        'time_entries': time_entries,
        'start_date': start_date,
        'end_date': end_date,
        'employee_name': employee_name,
        'include_parent_js': True,
        'referrer': request.path,
    })

def get_creator_name(user):
    if not user:
        return "Unknown"
    # Check if the username is numeric, indicating that it's an employee ID
    if user.username.isdigit():
        # Find the employee associated with this user and return their first name
        employee = Employee.objects.filter(user=user).first()
        if employee:
            return employee.first_name
    # If not an employee or employee not found, return the username
    return user.username

@login_required
def week_view(request):
    if not request.user.is_staff:
        return redirect('admin_login')

    # Get filter values from the request
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    employee_id = request.GET.get('employee_name')  # This is actually the employee ID

    # Set timezone
    tz = pytz.timezone('America/New_York')

    # Default date range: current month
    if not start_date or not end_date:
        today = timezone.now().date()
        start_date = today.replace(day=1)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

    start_date = tz.localize(datetime.combine(start_date, datetime.min.time()))
    end_date = tz.localize(datetime.combine(end_date, datetime.max.time()))

    employees = Employee.objects.all().order_by('first_name')
    
    # Use get() to fetch the employee if provided
    employee = Employee.objects.filter(id=employee_id).first() if employee_id else None

    # Optimize time entry and note fetching
    time_entries = TimeEntry.objects.filter(
        clock_in_time__gte=start_date,
        clock_in_time__lte=end_date,
        employee_id=employee_id
    ).select_related('employee').prefetch_related(
        Prefetch('notes', queryset=Note.objects.select_related('created_by'))
    ) .annotate(
        is_clocked_in=Case(
            When(clock_out_time__isnull=True, then=Value(True)),
            default=Value(False),
            output_field=BooleanField()
			)
    ) .order_by(
	    '-is_clocked_in',
	    'clock_in_time'
	)

    # Group entries by work week (Thursday to Wednesday)
    work_weeks = []
    total_hours = timedelta()  # Initialize total_hours to 0
    week_entries = defaultdict(lambda: OrderedDict())

    for entry in time_entries:
        clock_in_time_local = entry.clock_in_time.astimezone(tz)
        entry.clock_in_time_formatted = clock_in_time_local.strftime('%I:%M %p')
        entry.clock_in_time_formatted_date = clock_in_time_local.strftime('%a, %m/%d/%y')

        # Prefetch notes and format them
        entry.notes_display = [
            f"<small>{note.created_by.username if note.created_by else 'Employee'}</small>: {note.note_text}"
            for note in entry.notes.all()
        ]

        if entry.clock_out_time:
            clock_out_time_local = entry.clock_out_time.astimezone(tz)
            duration = clock_out_time_local - clock_in_time_local
            entry.hours_worked_formatted = "{:02}:{:02}".format(int(duration.total_seconds() // 3600), int((duration.total_seconds() % 3600) // 60))
            entry.hours_worked_display = f"{duration.seconds // 3600}h {(duration.seconds // 60) % 60}m"
            entry.clock_out_time_formatted = clock_out_time_local.strftime('%I:%M %p')
        else:
            duration = timedelta()  # No time worked if clock_out_time is missing
            entry.hours_worked_formatted = "00:00"
            entry.clock_out_time_formatted = 'Clocked In'

        weekday = clock_in_time_local.weekday()
        start_of_week = clock_in_time_local - timedelta(days=(weekday - 3 if weekday >= 3 else weekday + 4))
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Store entries in the ordered dictionary by date
        week_entries[start_of_week].setdefault(clock_in_time_local.date(), []).append(entry)

    # Prepare the final list of work weeks with their totals and entries
    work_weeks = []
    for start_of_week, day_entries in sorted(week_entries.items(), key=lambda x: x[0], reverse=True):
        weekly_total = timedelta()
        for day, entries in day_entries.items():
            daily_total = timedelta()
            # Sort entries by "Clocked In" (no clock_out_time) first, then by clock_in_time
            entries.sort(key=lambda x: (x.clock_out_time is not None, x.clock_in_time))

            for entry in entries:
                if entry.hours_worked_formatted != "00:00":
                    hours, minutes = map(int, entry.hours_worked_formatted.split(':'))
                    entry_duration = timedelta(hours=hours, minutes=minutes)
                    daily_total += entry_duration
                    entry.hours_worked_display = f"{hours}h {minutes}m"
                else:
                    entry.hours_worked_display = "0h 0m"

            
            # Add daily total to weekly total
            weekly_total += daily_total
            total_hours += daily_total  # Ensure total_hours includes the 15 minutes as well

        weekly_total_display = f"{weekly_total.days * 24 + weekly_total.seconds // 3600}h {(weekly_total.seconds // 60) % 60}m"
        work_weeks.append({
            'start_of_week': start_of_week,
            'day_groups': day_entries,
            'weekly_total_display': weekly_total_display
        })

    total_hours_display = f"{total_hours.days * 24 + total_hours.seconds // 3600}h {(total_hours.seconds // 60) % 60}m"
    
    return render(request, 'week_view.html', {
        'employee': employee,
        'employees': employees,
        'work_weeks': work_weeks,
        'total_hours_display': total_hours_display,
        'start_date': start_date,
        'end_date': end_date,
    })

@login_required
def who_is_in(request):
    if not request.user.is_staff:
        return redirect('admin_login')
    employees = Employee.objects.order_by('-clocked_in', 'first_name', 'last_name')
    return render(request, 'who_is_in.html', {'employees': employees})