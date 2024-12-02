from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import time, timedelta
from decimal import Decimal
from ...models import Employee, TimeEntry, Note
from ..serializers.admin_serializers import AdminTimeEntrySerializer
from ...views.time_entry_views import handle_notes, update_employee_clocked_in_status, parse_and_validate_time

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_vacation_entry(request):
    """Add a vacation time entry through the API."""
    try:
        # Parse data
        employee_id = request.data.get('employee_id_vacation')
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        notes_data = request.data.get('notes', [])

        # Parse dates
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

        # Get employee
        employee = get_object_or_404(Employee, id=employee_id)

        # Define workday times
        workday_start_time = time(8, 0)
        workday_end_time = time(17, 0)

        # Calculate total vacation hours
        total_vacation_hours = Decimal('0.00')
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() in range(0, 4):
                total_vacation_hours += Decimal('9.00')
            current_date += timedelta(days=1)

        # Check vacation hours remaining
        if total_vacation_hours > employee.vacation_hours_remaining:
            return Response({
                'status': 'error',
                'message': f'Unable to add {total_vacation_hours} vacation hours. Employee only has {employee.vacation_hours_remaining} hours remaining.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Add vacation entries
        entries = []
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() in range(0, 4):
                clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_end_time))
                
                time_entry = TimeEntry.objects.create(
                    employee=employee,
                    clock_in_time=clock_in_time,
                    clock_out_time=clock_out_time,
                    full_day=True,
                    is_vacation=True
                )

                handle_notes(time_entry, notes_data, request)
                entries.append(time_entry)

            current_date += timedelta(days=1)

        serializer = AdminTimeEntrySerializer(entries, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_sick_time_entry(request):
    """Add a sick time entry through the API."""
    try:
        # Parse data
        employee_id = request.data.get('employee_id_sick')
        clock_in_time_str = request.data.get('clock_in_time')
        clock_out_time_str = request.data.get('clock_out_time')
        notes_data = request.data.get('notes', [])

        # Parse and validate clock in/out times
        clock_in_time, clock_out_time = parse_and_validate_time(clock_in_time_str, clock_out_time_str)

        # Get employee
        employee = get_object_or_404(Employee, id=employee_id)

        # Calculate total sick hours
        total_sick_hours = Decimal((clock_out_time - clock_in_time).total_seconds() / 3600)

        # Check sick hours remaining
        if total_sick_hours > employee.sick_hours_remaining:
            return Response({
                'status': 'error',
                'message': f'Unable to add {total_sick_hours} sick hours. Employee only has {employee.sick_hours_remaining} hours remaining.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create TimeEntry
        time_entry = TimeEntry.objects.create(
            employee=employee,
            clock_in_time=clock_in_time,
            clock_out_time=clock_out_time,
            is_sick=True
        )

        # Handle notes
        handle_notes(time_entry, notes_data, request)

        serializer = AdminTimeEntrySerializer(time_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_holiday_entry(request):
    """Add holiday time entries through the API."""
    try:
        # Parse data
        employee_ids = request.data.get('employee_ids', [])
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        notes_data = request.data.get('notes', [])

        # Parse dates
        start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

        # Define workday times
        workday_start_time = time(8, 0)
        workday_end_time = time(17, 0)

        entries = []
        for employee_id in employee_ids:
            employee = get_object_or_404(Employee, id=employee_id)
            current_date = start_date
            while current_date <= end_date:
                if current_date.weekday() in range(0, 4):
                    clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                    clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_end_time))
                    time_entry = TimeEntry.objects.create(
                        employee=employee,
                        clock_in_time=clock_in_time,
                        clock_out_time=clock_out_time,
                        full_day=True,
                        is_holiday=True
                    )
                    handle_notes(time_entry, notes_data, request)
                    entries.append(time_entry)
                current_date += timedelta(days=1)

        serializer = AdminTimeEntrySerializer(entries, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
