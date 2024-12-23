from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse

from django.contrib.auth.decorators import login_required

from django.contrib import messages

from django.contrib.auth.models import User

from django.utils import timezone

from datetime import datetime, timedelta, time

from decimal import Decimal

import json

from ..models import Employee, TimeEntry, Note

import pytz





# Helper function to parse and validate time inputs

def parse_and_validate_time(clock_in_time_str, clock_out_time_str):

    clock_in_time = timezone.make_aware(datetime.fromisoformat(clock_in_time_str)) if clock_in_time_str else None

    clock_out_time = timezone.make_aware(datetime.fromisoformat(clock_out_time_str)) if clock_out_time_str else None

    if clock_in_time and clock_out_time and clock_out_time < clock_in_time:

        raise ValidationError("Clock-out time cannot be earlier than clock-in time.")

    return clock_in_time, clock_out_time





# Helper function to handle adding/editing notes

def handle_notes(time_entry, notes_data, request):

    for note_data in notes_data:

        note_id = note_data.get('id')

        note_text = note_data.get('note_text', '')

        created_by_username = note_data.get('created_by')

        # Fetch or create the note

        if note_id:

            note = get_object_or_404(Note, id=note_id, time_entry=time_entry)

            if note.created_by == request.user or note.created_by is None:

                if note_text:

                    note.note_text = note_text

                    note.save()

                else:

                    note.delete()

        elif note_text:

            created_by = get_object_or_404(User, username=created_by_username) if created_by_username else None

            Note.objects.create(time_entry=time_entry, created_by=created_by, note_text=note_text)





# Helper function to update employee clocked-in status

def update_employee_clocked_in_status(employee, clock_in_time, clock_out_time):

    if clock_in_time.date() == timezone.localtime(timezone.now()).date():

        employee.clocked_in = not bool(clock_out_time)

        employee.save(update_fields=['clocked_in'])





@login_required

def add_holiday_entry(request):

    if request.headers.get('x-requested-with') != 'XMLHttpRequest':

        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)



    if request.method == 'POST':

        try:

            data = json.loads(request.body)

            employee_ids = data.get('employee_ids', [])

            start_date_str = data.get('start_date')

            end_date_str = data.get('end_date')

            notes_data = data.get('notes', [])



            start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None

            end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

            workday_start_time = time(8, 0)

            workday_end_time = time(17, 0)

            friday_end_time = time(12, 0)



            for employee_id in employee_ids:

                employee = get_object_or_404(Employee, id=employee_id)

                current_date = start_date

                while current_date <= end_date:

                    if current_date.weekday() in range(0, 4):
                        clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                        clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_end_time))
                    elif current_date.weekday() == 4:
                        clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                        clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, friday_end_time))

                    time_entry = TimeEntry.objects.create(
                        employee=employee,
                        clock_in_time=clock_in_time,
                        clock_out_time=clock_out_time,
                        full_day=True
                    )

                    handle_notes(time_entry, notes_data, request)

                    current_date += timedelta(days=1)



            messages.success(request, 'Holiday time entries successfully added for selected employees!')

            return JsonResponse({'status': 'success'})

        except Exception as e:

            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'}, status=500)



    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)





@login_required

def add_time_entry(request):

    if request.headers.get('x-requested-with') != 'XMLHttpRequest':

        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)



    if request.method == 'POST':

        try:

            data = json.loads(request.body)

            employee_id = data.get('employee_id')

            clock_in_time_str = data.get('clock_in_time')

            clock_out_time_str = data.get('clock_out_time')

            is_vacation = data.get('is_vacation', False)

            notes_data = data.get('notes', [])



            clock_in_time, clock_out_time = parse_and_validate_time(clock_in_time_str, clock_out_time_str)

            employee = get_object_or_404(Employee, id=employee_id)



            if is_vacation and (not clock_out_time or clock_out_time - clock_in_time > timedelta(hours=float(employee.vacation_hours_remaining))):

                return JsonResponse({'status': 'error', 'message': f'Not enough vacation hours. Remaining: {employee.vacation_hours_remaining}'}, status=400)



            time_entry = TimeEntry.objects.create(
                employee=employee,
                clock_in_time=clock_in_time,
                clock_out_time=clock_out_time,
                is_vacation=is_vacation
            )



            handle_notes(time_entry, notes_data, request)

            update_employee_clocked_in_status(employee, clock_in_time, clock_out_time)



            messages.success(request, 'Time entry successfully added.')

            return JsonResponse({'status': 'success'})

        except Exception as e:

            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'}, status=500)



    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)





@login_required

def edit_time_entry(request, entry_id):

    if request.headers.get('x-requested-with') != 'XMLHttpRequest':

        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)



    time_entry = get_object_or_404(TimeEntry, id=entry_id)

    if request.method == 'POST':

        try:

            data = json.loads(request.body)

            clock_in_time_str = data.get('clock_in_time')

            clock_out_time_str = data.get('clock_out_time')

            notes_data = data.get('notes', [])



            clock_in_time, clock_out_time = parse_and_validate_time(clock_in_time_str, clock_out_time_str)



            time_entry.clock_in_time = clock_in_time

            time_entry.clock_out_time = clock_out_time

            time_entry.save()



            handle_notes(time_entry, notes_data, request)

            update_employee_clocked_in_status(time_entry.employee, clock_in_time, clock_out_time)



            messages.success(request, 'Time entry successfully updated.')

            return JsonResponse({'status': 'success'})

        except Exception as e:

            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'}, status=500)

    else:

        local_tz = pytz.timezone('America/New_York')

        data = {

            'clock_in_time': time_entry.clock_in_time.astimezone(local_tz).strftime('%Y-%m-%dT%H:%M'),

            'clock_out_time': time_entry.clock_out_time.astimezone(local_tz).strftime('%Y-%m-%dT%H:%M') if time_entry.clock_out_time else '',

            'notes': [

                {

                    'id': note.id,

                    'note_text': note.note_text,

                    'editable': note.created_by is None or note.created_by == request.user,

                    'created_by': note.created_by.username if note.created_by else 'Employee',

                    'created_at': note.created_at.strftime('%Y-%m-%d %H:%M'),

                    'updated_at': note.updated_at.strftime('%Y-%m-%d %H:%M')

                } for note in time_entry.notes.all()

            ]

        }

        return JsonResponse(data)





@login_required

def remove_time_entry(request, entry_id):

    if not request.user.is_staff:

        return JsonResponse({'status': 'error', 'message': 'Unauthorized access.'}, status=403)



    if request.headers.get('x-requested-with') != 'XMLHttpRequest':

        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)



    time_entry = get_object_or_404(TimeEntry, id=entry_id)

    if request.method == 'POST':

        try:

            time_entry.employee.clocked_in = False

            time_entry.employee.save(update_fields=['clocked_in'])

            time_entry.delete()

            messages.success(request, 'Time entry successfully removed.')

            return JsonResponse({'status': 'success'})

        except Exception as e:

            return JsonResponse({'status': 'error', 'message': f'An error occurred: {str(e)}'}, status=500)



    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
