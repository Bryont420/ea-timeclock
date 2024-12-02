from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseRedirect
from django.utils import timezone
from django.views.decorators.http import require_POST
from ..models import Employee, TimeEntry, Note
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from datetime import timedelta, datetime
from collections import defaultdict, OrderedDict
from decimal import Decimal
import pytz
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.contrib.auth.forms import PasswordChangeForm
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.contrib import messages
from django.db.models import Prefetch
from django.templatetags.static import static
import os
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives
from django.utils.timezone import localtime
from django.db import transaction
from .email_helpers import send_shared_mail

def employee_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        if username and password:
            # Authenticate the user
            user = authenticate(request, username=username, password=password)
            if user is not None and not user.is_staff:
                employee = Employee.objects.get(user=user)

                # If the employee needs to change their password, redirect them to the password change page
                if employee.force_password_change:
                    login(request, user)
                    return redirect('force_password_change')

                # If not, proceed as normal
                login(request, user)
                next_url = request.POST.get('next')
                if next_url:
                    return redirect(next_url)
                return redirect('employee_info')  # Default redirect to employee info

            elif user is not None and user.is_staff:
                return render(request, 'employee_login.html', {'error': 'You are an admin, USERS ONLY!'})

            else:
                return render(request, 'employee_login.html', {'error': 'Invalid username or password.'})
        else:
            return render(request, 'employee_login.html', {'error': 'Please enter both username and password.'})

    next_url = request.GET.get('next', '')
    return render(request, 'employee_login.html', {'next': next_url})
    
@login_required(login_url='employee_login')
def force_password_change(request):
    employee = Employee.objects.get(user=request.user)

    if request.method == 'POST':
        password = request.POST.get('password')

        if password:
            try:
                validate_password(password, request.user)
                request.user.set_password(password)
                request.user.save()

                update_session_auth_hash(request, request.user)  # Keep the user logged in after password change

                # Reset the force_password_change flag
                employee.force_password_change = False
                employee.save()

                messages.success(request, 'Your password has been changed successfully.')
                return redirect('employee_info')
            except ValidationError as e:
                messages.error(request, ', '.join(e.messages))

    return render(request, 'force_password_change.html')

def employee_logout(request):
    if request.method == 'POST':
        logout(request)
        # Check if the request is an AJAX request
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            # Return a JSON response for AJAX calls
            return JsonResponse({'success': True, 'message': 'Logged out successfully'})
        else:
            # Otherwise, redirect to the timeclock screen
            return HttpResponseRedirect(reverse('timeclock_screen'))
    
@login_required(login_url='employee_login')
def employee_info(request):
    if request.user.is_staff:
        return redirect('employee_login')

    # Get current employee
    employee = Employee.objects.get(user=request.user)

    # Get current month range
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)

    # Determine the day of the week for the start_of_month (Monday=0, Tuesday=1, ..., Sunday=6)
    weekday_of_start_of_month = start_of_month.weekday()

    # Adjust the start_of_month to the previous Thursday if necessary
    if weekday_of_start_of_month >= 3:
        # If the first day of the month is Thursday (3), Friday (4), Saturday (5), or Sunday (6)
        # Move back to the Thursday of that week
        adjusted_days = weekday_of_start_of_month - 3
    else:
        # If the first day of the month is Monday (0), Tuesday (1), or Wednesday (2)
        # Move back to the previous Thursday
        adjusted_days = weekday_of_start_of_month + 4

    adjusted_start_of_month = start_of_month - timedelta(days=adjusted_days)

    # Set timezone
    tz = pytz.timezone('America/New_York')
    start_of_month = tz.localize(timezone.datetime.combine(adjusted_start_of_month, timezone.datetime.min.time()))
    end_of_month = tz.localize(timezone.datetime.combine(end_of_month, timezone.datetime.max.time()))

    # Prefetch notes in a single query
    notes_prefetch = Prefetch('notes', queryset=Note.objects.order_by('created_at'))

    # Optimize the query by using select_related and prefetch_related
    time_entries = TimeEntry.objects.filter(
        employee=employee,
        clock_in_time__gte=start_of_month,
        clock_in_time__lte=end_of_month
    ).order_by('clock_in_time').prefetch_related(notes_prefetch)

    # Group entries by work week (Thursday to Wednesday)
    week_entries = defaultdict(list)
    total_hours_for_month = timedelta()

    for entry in time_entries:
        clock_in_time_local = localtime(entry.clock_in_time)
        entry.clock_in_time_formatted = clock_in_time_local.strftime('%I:%M %p')
        entry.clock_in_time_formatted_date = clock_in_time_local.strftime('%a, %m/%d/%Y')

        # Include notes for each entry (already prefetched)
        entry.notes_list = entry.notes.all()

        # Calculate hours worked and format them
        if entry.clock_out_time:
            clock_out_time_local = localtime(entry.clock_out_time)
            duration = clock_out_time_local - clock_in_time_local
            entry.hours_worked_formatted = f"{int(duration.total_seconds() // 3600)}:{int((duration.total_seconds() % 3600) // 60)}"
            entry.clock_out_time_formatted = clock_out_time_local.strftime('%I:%M %p')
        else:
            duration = timedelta()
            entry.hours_worked_formatted = "0:0"
            entry.clock_out_time_formatted = 'Clocked In'

        # Determine start of the work week (Thursday to Wednesday)
        weekday = clock_in_time_local.weekday()
        start_of_week = clock_in_time_local - timedelta(days=(weekday - 3 if weekday >= 3 else weekday + 4))
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

        # Store entries by week and date
        week_entries[start_of_week].append(entry)

    # Prepare grouped entries and calculate total hours for each week
    grouped_weeks = []
    for start_of_week, entries in sorted(week_entries.items(), key=lambda x: x[0], reverse=True):
        weekly_total = timedelta()
        day_entries = defaultdict(list)

        # Group entries by day
        for entry in entries:
            clock_in_date = localtime(entry.clock_in_time).date()
            day_entries[clock_in_date].append(entry)

        for day, day_entry_list in day_entries.items():
            daily_total = timedelta()

            # Calculate daily total for all entries on that day
            for entry in day_entry_list:
                hours, minutes = map(int, entry.hours_worked_formatted.split(':'))
                entry_duration = timedelta(hours=hours, minutes=minutes)
                daily_total += entry_duration

            weekly_total += daily_total
            total_hours_for_month += daily_total

        weekly_total_display = f"{weekly_total.days * 24 + weekly_total.seconds // 3600}h {(weekly_total.seconds // 60) % 60}m"
        grouped_weeks.append({
            'start_of_week': start_of_week,
            'end_of_week': start_of_week + timedelta(days=6),
            'entries': entries,
            'weekly_total_display': weekly_total_display
        })

    # Convert vacation hours to H M format
    vacation_hours_allocated = convert_decimal_hours_to_hm(employee.vacation_hours_allocated)
    vacation_hours_used = convert_decimal_hours_to_hm(employee.vacation_hours_used)
    vacation_hours_remaining = convert_decimal_hours_to_hm(employee.vacation_hours_remaining)

    # Convert sick hours to H M format
    sick_hours_allocated = convert_decimal_hours_to_hm(employee.sick_hours_allocated)
    sick_hours_used = convert_decimal_hours_to_hm(employee.sick_hours_used)
    sick_hours_remaining = convert_decimal_hours_to_hm(employee.sick_hours_remaining)

    # Total hours for the month display
    total_hours_display = f"{total_hours_for_month.days * 24 + total_hours_for_month.seconds // 3600}h {(total_hours_for_month.seconds // 60) % 60}m"

    # Directory for employee backgrounds
    background_image_dir = os.path.join(settings.BASE_DIR, 'timeclock/static/timeclock/images/employee_backgrounds')

    # List all background images in the directory
    background_images = os.listdir(background_image_dir)

    return render(request, 'employee_info.html', {
        'employee': employee,
        'start_of_month': adjusted_start_of_month,
        'end_of_month': end_of_month,
        'week_entries': grouped_weeks,
        'total_hours_display': total_hours_display,
        'vacation_hours_allocated': vacation_hours_allocated,
        'vacation_hours_used': vacation_hours_used,
        'vacation_hours_remaining': vacation_hours_remaining,
        'sick_hours_allocated': sick_hours_allocated,
        'sick_hours_used': sick_hours_used,
        'sick_hours_remaining': sick_hours_remaining,
        'background_images': background_images,  # Pass the background images to the template
    })

def change_background_ajax(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')  # Get employee ID from the POST data
        background_image = request.POST.get('background_image')  # Get the selected background image

        # Directory for employee backgrounds
        background_image_dir = os.path.join(settings.BASE_DIR, 'timeclock/static/timeclock/images/employee_backgrounds')

        # Validate if the selected background image exists in the directory
        available_images = os.listdir(background_image_dir)
        if background_image not in available_images:
            return JsonResponse({'success': False, 'message': 'Invalid background image selected.'}, status=400)

        # Find the employee by employee_id
        employee = get_object_or_404(Employee, employee_id=employee_id)

        # Update the employee's background image field
        employee.background_image = background_image
        employee.save()

        # Construct the URL for the new background image
        background_image_url = static(f'timeclock/images/employee_backgrounds/{background_image}')

        # Return a success response with the new image URL
        return JsonResponse({
            'success': True,
            'message': 'Background updated successfully.',
            'background_image_url': background_image_url
        })

    # If the request is not POST, return an error response
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=400)

def send_employee_info_email(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')

        # Get the employee object
        try:
            employee = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found.'})

        # Get current month range
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        # Determine the day of the week for the start_of_month (Monday=0, Tuesday=1, ..., Sunday=6)
        weekday_of_start_of_month = start_of_month.weekday()

        # Adjust the start_of_month to the previous Thursday if necessary
        if weekday_of_start_of_month >= 3:
            # If the first day of the month is Thursday (3), Friday (4), Saturday (5), or Sunday (6)
            # Move back to the Thursday of that week
            adjusted_days = weekday_of_start_of_month - 3
        else:
            # If the first day of the month is Monday (0), Tuesday (1), or Wednesday (2)
            # Move back to the previous Thursday
            adjusted_days = weekday_of_start_of_month + 4

        adjusted_start_of_month = start_of_month - timedelta(days=adjusted_days)

        # Set timezone
        tz = pytz.timezone('America/New_York')
        start_of_month = tz.localize(timezone.datetime.combine(adjusted_start_of_month, timezone.datetime.min.time()))
        end_of_month = tz.localize(timezone.datetime.combine(end_of_month, timezone.datetime.max.time()))

        # Fetch time entries
        notes_prefetch = Prefetch('notes', queryset=Note.objects.order_by('created_at'))
        time_entries = TimeEntry.objects.filter(
            employee=employee,
            clock_in_time__gte=start_of_month,
            clock_in_time__lte=end_of_month
        ).order_by('clock_in_time').prefetch_related(notes_prefetch)

        # Group entries by work week
        week_entries = defaultdict(list)
        total_hours_for_month = timedelta()

        for entry in time_entries:
            clock_in_time_local = localtime(entry.clock_in_time)
            entry.clock_in_time_formatted = clock_in_time_local.strftime('%I:%M %p')
            entry.clock_in_time_formatted_date = clock_in_time_local.strftime('%a, %m/%d/%Y')

            if entry.clock_out_time:
                clock_out_time_local = localtime(entry.clock_out_time)
                duration = clock_out_time_local - clock_in_time_local
                entry.hours_worked_formatted = f"{int(duration.total_seconds() // 3600)}h {int((duration.total_seconds() % 3600) // 60)}m"
                entry.clock_out_time_formatted = clock_out_time_local.strftime('%I:%M %p')
            else:
                duration = timedelta()
                entry.hours_worked_formatted = "0h 0m"
                entry.clock_out_time_formatted = 'Clocked In'

            # Include notes for each entry
            entry.notes_list = entry.notes.all()

            # Determine start of the work week (Thursday to Wednesday)
            weekday = clock_in_time_local.weekday()
            start_of_week = clock_in_time_local - timedelta(days=(weekday - 3 if weekday >= 3 else weekday + 4))
            start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

            week_entries[start_of_week].append(entry)

        # Prepare grouped entries and calculate total hours for each week
        grouped_weeks = []
        for start_of_week, entries in sorted(week_entries.items(), key=lambda x: x[0], reverse=True):
            weekly_total = timedelta()

            day_entries = defaultdict(list)

            # Group entries by day
            for entry in entries:
                day_key = entry.clock_in_time.date()
                day_entries[day_key].append(entry)

            for day, day_entries_list in day_entries.items():
                daily_total = timedelta()

                # Calculate daily total
                for entry in day_entries_list:
                    hours_worked_str = entry.hours_worked_formatted.replace('h', '').replace('m', '').strip()
                    hours, minutes = map(int, hours_worked_str.split())
                    entry_duration = timedelta(hours=hours, minutes=minutes)
                    daily_total += entry_duration

                weekly_total += daily_total
                total_hours_for_month += daily_total

            weekly_total_display = f"{weekly_total.days * 24 + weekly_total.seconds // 3600}h {(weekly_total.seconds // 60) % 60}m"
            grouped_weeks.append({
                'start_of_week': start_of_week,
                'end_of_week': start_of_week + timedelta(days=6),
                'entries': entries,
                'weekly_total_display': weekly_total_display
            })

        # Prepare the email content
        subject = 'Your Employee Info'
        email_template = 'employee_info_email_template.html'
        message_html = render_to_string(email_template, {
            'employee': employee,
            'vacation_hours_allocated': convert_decimal_hours_to_hm(employee.vacation_hours_allocated),
            'vacation_hours_used': convert_decimal_hours_to_hm(employee.vacation_hours_used),
            'vacation_hours_remaining': convert_decimal_hours_to_hm(employee.vacation_hours_remaining),
            'sick_hours_allocated': convert_decimal_hours_to_hm(employee.sick_hours_allocated),
            'sick_hours_used': convert_decimal_hours_to_hm(employee.sick_hours_used),
            'sick_hours_remaining': convert_decimal_hours_to_hm(employee.sick_hours_remaining),
            'grouped_weeks': grouped_weeks,  # Time entries grouped by week
            'total_hours_for_month': f"{total_hours_for_month.days * 24 + total_hours_for_month.seconds // 3600}h {(total_hours_for_month.seconds // 60) % 60}m",
        })

        # Send the email
        try:
            send_shared_mail(
                to_email=employee.user.email,
                subject=subject,
                body=message_html
            )

            return JsonResponse({'success': True, 'message': 'Employee info email sent successfully.'})
        except Exception as e:
            print(f"Error sending email: {str(e)}")
            return JsonResponse({'success': False, 'message': f'Error sending email: {str(e)}'})

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

def timeclock_screen(request):
    # Render the dashboard template without checking status here
    return render(request, 'timeclock_screen.html')

def clock_in(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        with transaction.atomic():
            employee = get_object_or_404(Employee.objects.select_for_update(), employee_id=employee_id)
            if not employee.clocked_in:
                TimeEntry.objects.create(employee=employee, clock_in_time=timezone.now())
                employee.clocked_in = True
                employee.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)


def clock_out(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        with transaction.atomic():
            employee = get_object_or_404(Employee.objects.select_for_update(), employee_id=employee_id)
            if employee.clocked_in:
                time_entry = TimeEntry.objects.filter(employee=employee, clock_out_time__isnull=True).select_for_update().first()
                if time_entry:
                    time_entry.clock_out_time = timezone.now()
                    time_entry.save()
                employee.clocked_in = False
                employee.save()
        return JsonResponse({'status': 'success'})
    return JsonResponse({'status': 'error'}, status=400)


def check_status(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id', '').strip()

        if not employee_id.isdigit():
            return JsonResponse({'full_name': 'Invalid employee ID', 'button_text': 'Clock In / Out', 'employee_id': None, 'time_entries': []})

        try:
            employee_id = int(employee_id)
            employee = Employee.objects.get(employee_id=employee_id)
            full_name = f"{employee.first_name} {employee.last_name}"
            button_text = 'Clock Out' if employee.clocked_in else 'Clock In'

            # Get today's time entries for the employee
            today = timezone.localdate()
            time_entries = TimeEntry.objects.filter(employee=employee, clock_in_time__date=today)

            # Format the times in local timezone and AM/PM format
            formatted_entries = []
            for entry in time_entries:
                clock_in_local = timezone.localtime(entry.clock_in_time).strftime('%I:%M %p')
                clock_out_local = timezone.localtime(entry.clock_out_time).strftime('%I:%M %p') if entry.clock_out_time else 'Clocked In'
                
                formatted_entries.append({
                    'id': entry.id,
                    'clock_in_time': clock_in_local,
                    'clock_out_time': clock_out_local
                })

            response_data = {
                'full_name': full_name,
                'button_text': button_text,
                'employee_id': employee.employee_id,
                'time_entries': formatted_entries
            }
        except Employee.DoesNotExist:
            response_data = {
                'full_name': 'Employee not found',
                'button_text': 'Clock In / Out',
                'employee_id': None,
                'time_entries': []
            }
        except ValueError:
            response_data = {
                'full_name': 'Invalid employee ID',
                'button_text': 'Clock In / Out',
                'employee_id': None,
                'time_entries': []
            }

        return JsonResponse(response_data)
    return JsonResponse({'status': 'error'}, status=400)

@require_POST
def add_note_to_time_entry(request):
    entry_id = request.POST.get('entry_id')
    new_note_text = request.POST.get('note').strip()
    employee_id = request.POST.get('employee_id', '').strip()

    try:
        # Fetch the TimeEntry object
        time_entry = get_object_or_404(TimeEntry, id=entry_id)

        # Ensure employee_id is valid
        if not employee_id.isdigit():
            return JsonResponse({'status': 'error', 'message': 'Invalid employee ID.'}, status=400)

        # Fetch the Employee object
        employee = get_object_or_404(Employee, employee_id=employee_id)

        # Create a new Note associated with this time entry and set created_by to the employee's user
        new_note = Note(
            time_entry=time_entry,
            note_text=new_note_text,
            created_by=employee.user  # Use the employee's user as the creator
        )
        new_note.save()

        # Prepare the response with the new note formatted for display
        creator_name = new_note.created_by.username if new_note.created_by else 'Employee'
        formatted_note = f"<small>{creator_name}</small>: {new_note.note_text}"
        
        return JsonResponse({'status': 'success', 'note': formatted_note})
    except TimeEntry.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Time entry not found.'}, status=404)
    except Employee.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Employee not found.'}, status=404)

def clock_action(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            if employee.clocked_in:
                clock_out(request)
                message = "You have successfully clocked out."
                button_text = "Clock In"
            else:
                clock_in(request)
                message = "You have successfully clocked in."
                button_text = "Clock Out"
            return JsonResponse({'status': 'success', 'message': message, 'button_text': button_text})
        except Employee.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Employee not found.'}, status=404)
    return JsonResponse({'status': 'error'}, status=400)

def convert_decimal_hours_to_hm(decimal_hours):
    total_minutes = int(decimal_hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours}H {minutes}M"
