from ..forms import ResetVacationHoursForm  # Form for resetting vacation hours
from ..models import Employee, TimeEntry, Note  # Models for the application
from django.shortcuts import render, get_object_or_404, redirect  # Helper methods for view logic
from django.http import JsonResponse  # To return JSON responses
from django.utils import timezone  # For timezone handling
from django.contrib.auth.models import User  # User model to get created_by
from decimal import Decimal  # For handling decimal operations
from datetime import time, timedelta  # For defining time and timedelta
import json  # To handle JSON data
from django.contrib import messages  # To handle success/error messages
from django.contrib.auth.decorators import login_required  # For restricting views based on authentication
from .time_entry_views import handle_notes, update_employee_clocked_in_status, parse_and_validate_time  # Import helpers

@login_required
def add_vacation_entry(request):
    if request.headers.get('x-requested-with') != 'XMLHttpRequest':
        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)

    if request.method == 'POST':
        try:
            # Parse JSON data
            data = json.loads(request.body)
            employee_id = data.get('employee_id_vacation')
            start_date_str = data.get('start_date')
            end_date_str = data.get('end_date')
            notes_data = data.get('notes', [])

            # Parse dates
            start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
            end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

            # Get employee
            employee = get_object_or_404(Employee, id=employee_id)

            # Define workday times
            workday_start_time = time(8, 0)
            workday_end_time = time(17, 0)
            friday_end_time = time(12, 0)

            # Calculate total vacation hours
            total_vacation_hours = Decimal('0.00')
            current_date = start_date
            while current_date <= end_date:
                if current_date.weekday() in range(0, 4):
                    total_vacation_hours += Decimal('9.00')
                elif current_date.weekday() == 4:  # Friday
                    total_vacation_hours += Decimal('4.00')
                current_date += timedelta(days=1)

            # Check vacation hours remaining
            if total_vacation_hours > employee.vacation_hours_remaining:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Unable to add {total_vacation_hours} vacation hours. Employee only has {employee.vacation_hours_remaining} hours remaining.'
                }, status=400)

            # Add vacation entries
            current_date = start_date
            while current_date <= end_date:
                if current_date.weekday() in range(0, 4):
                    clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                    clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_end_time))
                elif current_date.weekday() == 4:  # Friday
                    clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                    clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, friday_end_time))
                else:
                    current_date += timedelta(days=1)
                    continue

                time_entry = TimeEntry.objects.create(
                    employee=employee,
                    clock_in_time=clock_in_time,
                    clock_out_time=clock_out_time,
                    full_day=True,
                    is_vacation=True
                )

                handle_notes(time_entry, notes_data, request)
                current_date += timedelta(days=1)

            messages.success(request, f'Vacation time entries successfully added for {employee.first_name} {employee.last_name}!')
            return JsonResponse({'status': 'success'})
        except Exception as e:
            messages.error(request, f'Error: {str(e)}')
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
    
def vacation_hours_list(request):
    if not request.user.is_staff:
        return redirect('admin_login')

    employees = Employee.objects.all()
    
    # Modify the employee queryset to include formatted vacation hours
    for employee in employees:
        if employee.vacation_hours_remaining is not None:
            total_minutes = int(employee.vacation_hours_remaining * 60)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            employee.vacation_hours_formatted = f"{hours}H {minutes}M"
        else:
            employee.vacation_hours_formatted = "0H 0M"  # Handle case where no hours are left

    return render(request, 'vacation_hours_list.html', {'employees': employees})

    
def reset_vacation_hours(request, employee_id):
    employee = get_object_or_404(Employee, id=employee_id)
    
    if request.method == 'POST':
        form = ResetVacationHoursForm(request.POST)
        if form.is_valid():
            # Set the new allocated hours and reset used hours
            employee.vacation_hours_allocated = form.cleaned_data['vacation_hours_allocated']
            employee.vacation_hours_used = Decimal('0.00')
            employee.save()
            return JsonResponse({
                'success': True,
                'allocated': employee.vacation_hours_allocated,
                'remaining': employee.vacation_hours_remaining
            })
        return JsonResponse({'success': False, 'errors': form.errors}, status=400)

    return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)