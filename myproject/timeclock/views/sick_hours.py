from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import time, timedelta
from django.contrib import messages
from django.contrib.auth.decorators import login_required
import json

from ..models import Employee, TimeEntry, Note  # Import necessary models
from ..forms import ResetSickHoursForm  # Form for resetting sick hours
from .time_entry_views import handle_notes, update_employee_clocked_in_status, parse_and_validate_time  # Import helpers

@login_required
def add_sick_time_entry(request):
    if request.headers.get('x-requested-with') != 'XMLHttpRequest':
        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)

    if request.method == 'POST':
        try:
            # Parse JSON data
            data = json.loads(request.body)
            employee_id = data.get('employee_id_sick')
            clock_in_time_str = data.get('clock_in_time')
            clock_out_time_str = data.get('clock_out_time')
            notes_data = data.get('notes', [])

            # Parse and validate clock in/out times
            clock_in_time, clock_out_time = parse_and_validate_time(clock_in_time_str, clock_out_time_str)

            # Get employee
            employee = get_object_or_404(Employee, id=employee_id)

            # Calculate total sick hours
            total_sick_hours = Decimal((clock_out_time - clock_in_time).total_seconds() / 3600)

            # Check sick hours remaining
            if total_sick_hours > employee.sick_hours_remaining:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Unable to add {total_sick_hours} sick hours. Employee only has {employee.sick_hours_remaining} hours remaining.'
                }, status=400)

            # Create TimeEntry
            time_entry = TimeEntry.objects.create(
                employee=employee,
                clock_in_time=clock_in_time,
                clock_out_time=clock_out_time,
                is_sick=True
            )

            # Handle notes
            handle_notes(time_entry, notes_data, request)

            messages.success(request, f'Sick time entry successfully added for {employee.first_name} {employee.last_name}!')
            return JsonResponse({'status': 'success'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

@login_required
def sick_hours_list(request):
    if not request.user.is_staff:
        return redirect('admin_login')

    # Fetch all employees to display their sick hours
    employees = Employee.objects.all()
    
    # Modify the employee queryset to include formatted sick hours
    for employee in employees:
        if employee.sick_hours_remaining is not None:
            total_minutes = int(employee.sick_hours_remaining * 60)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            employee.sick_hours_formatted = f"{hours}H {minutes}M"
        else:
            employee.sick_hours_formatted = "0H 0M"  # Handle case where no hours are left

    return render(request, 'sick_hours_list.html', {'employees': employees})

@login_required
def reset_sick_hours(request, employee_id):
    employee = get_object_or_404(Employee, id=employee_id)

    if request.method == 'POST':
        form = ResetSickHoursForm(request.POST)  # Reusing the form from vacation or a specific sick form
        if form.is_valid():
            # Set the new allocated hours and reset used hours
            employee.sick_hours_allocated = form.cleaned_data['sick_hours_allocated']
            employee.sick_hours_used = Decimal('0.00')  # Reset the used sick hours
            employee.save()

            # Return a success response with the new sick hours data
            return JsonResponse({
                'success': True,
                'allocated': employee.sick_hours_allocated,
                'remaining': employee.sick_hours_remaining
            })

        # Return validation errors if the form is invalid
        return JsonResponse({'success': False, 'errors': form.errors}, status=400)

    return JsonResponse({'success': False, 'message': 'Invalid request'}, status=400)
