from rest_framework import serializers
from ...models import TimeOffRequest
import logging

logger = logging.getLogger(__name__)

class TimeOffRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    request_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    hours_remaining = serializers.SerializerMethodField()

    class Meta:
        model = TimeOffRequest
        fields = [
            'id', 'employee', 'employee_name', 'request_type', 'request_type_display',
            'start_date', 'end_date', 'hours_requested', 'reason', 'status',
            'status_display', 'created_at', 'updated_at', 'review_notes',
            'can_edit', 'hours_remaining', 'is_partial_day', 'start_time', 'end_time'
        ]
        read_only_fields = ['status', 'review_notes', 'created_at', 'updated_at', 'employee']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_request_type_display(self, obj):
        return obj.get_request_type_display()

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_can_edit(self, obj):
        return obj.status == 'pending'

    def get_hours_remaining(self, obj):
        if obj.request_type == 'vacation':
            return float(obj.employee.vacation_hours_remaining)
        elif obj.request_type == 'sick':
            return float(obj.employee.sick_hours_remaining)
        return None

    def validate(self, data):
        # Get the employee from the context
        employee = self.context['request'].user.employee
        instance = self.instance
        
        # Validate start and end dates
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        is_partial_day = data.get('is_partial_day', False)

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("End date must be after start date")

        if is_partial_day:
            if start_date != end_date:
                raise serializers.ValidationError("For partial day requests, start and end date must be the same")
            if not (data.get('start_time') and data.get('end_time')):
                raise serializers.ValidationError("Start time and end time are required for partial day requests")
            if data.get('start_time') >= data.get('end_time'):
                raise serializers.ValidationError("End time must be after start time")

        # Check for department overlaps
        # Get all pending and approved requests for the same department
        department_requests = TimeOffRequest.objects.filter(
            employee__department=employee.department,
            status__in=['pending', 'approved']  # Check both pending and approved requests
        )

        # Exclude current instance if updating
        if instance:
            department_requests = department_requests.exclude(id=instance.id)

        # Filter for date overlaps
        overlapping_requests = department_requests.filter(
            start_date__lte=end_date,
            end_date__gte=start_date
        )

        # For partial day requests, also check time overlaps
        if is_partial_day:
            overlapping_requests = overlapping_requests.filter(
                is_partial_day=True,
                start_date=start_date,  # Only check same day for partial
                start_time__lt=data.get('end_time'),
                end_time__gt=data.get('start_time')
            )

        if overlapping_requests.exists():
            overlapping_request = overlapping_requests.first()
            employee_name = f"{overlapping_request.employee.first_name} {overlapping_request.employee.last_name}"
            status_text = "pending" if overlapping_request.status == "pending" else "approved"
            error_message = (
                f"This request overlaps with another {status_text} time off request in the {employee.get_department_display()} department. "
                f"{employee_name} is scheduled off on {overlapping_request.start_date.strftime('%m-%d-%Y')}"
            )
            if overlapping_request.is_partial_day:
                error_message += f" ({overlapping_request.start_time.strftime('%I:%M %p')} - {overlapping_request.end_time.strftime('%I:%M %p')})"
            elif overlapping_request.end_date != overlapping_request.start_date:
                error_message += f" to {overlapping_request.end_date.strftime('%m-%d-%Y')}"
            
            error_message += ".\n\nIf you still need this time off please see Deanna in Person."
            
            raise serializers.ValidationError({
                "non_field_errors": [error_message]
            })

        # Check for overlapping requests for the same employee
        overlapping = TimeOffRequest.objects.filter(
            employee=employee,
            status__in=['pending', 'approved'],
            start_date__lte=end_date,
            end_date__gte=start_date
        )

        if instance:
            overlapping = overlapping.exclude(id=instance.id)

        if is_partial_day:
            overlapping = overlapping.filter(
                is_partial_day=True,
                start_date=start_date,
                start_time__lt=data.get('end_time'),
                end_time__gt=data.get('start_time')
            )

        if overlapping.exists():
            raise serializers.ValidationError("You already have a time off request for this period")

        # Check for future year hours
        from datetime import date
        today = date.today()
        next_year = today.year + 1
        is_future_request = data['start_date'].year == next_year or data['end_date'].year == next_year

        if is_future_request and data['request_type'] in ['vacation', 'sick']:
            years_employed = next_year - employee.hire_date.year
            if today >= employee.hire_date.replace(year=today.year):
                years_employed = next_year - employee.hire_date.year
            else:
                years_employed = next_year - employee.hire_date.year - 1

            if data['request_type'] == 'vacation':
                if 0 <= years_employed < 5:
                    future_hours = 40.0
                elif 5 <= years_employed < 10:
                    future_hours = 80.0
                else:
                    future_hours = 120.0
            elif data['request_type'] == 'sick':
                future_hours = 18.0
            
            if data['request_type'] == 'vacation':
                future_remaining = future_hours - float(employee.future_vacation_hours_used)
            else:
                future_remaining = future_hours - float(employee.future_sick_hours_used)

            hours_requested = data['hours_requested']
            if hours_requested > future_remaining:
                raise serializers.ValidationError({
                    'error': 'insufficient_future_hours',
                    'message': f"Not enough {data['request_type']} hours available for next year. You will have {future_remaining:.1f} hours, but requested {hours_requested:.1f} hours.",
                    'hours_requested': hours_requested,
                    'hours_remaining': future_remaining,
                    'future_allocation': future_hours
                })
        else:
            if data['request_type'] in ['vacation', 'sick']:
                hours_requested = data['hours_requested']
                logger.info(f"Checking {data['request_type']} hours. Requested: {hours_requested}")
                
                if data['request_type'] == 'vacation':
                    remaining = float(employee.vacation_hours_remaining)
                    logger.info(f"Vacation hours remaining: {remaining}")
                    if hours_requested > remaining:
                        logger.info("Insufficient vacation hours")
                        raise serializers.ValidationError({
                            'error': 'insufficient_hours',
                            'message': f"Not enough vacation hours available. You have {remaining:.1f} hours remaining, but requested {hours_requested:.1f} hours.",
                            'hours_requested': hours_requested,
                            'hours_remaining': remaining
                        })
                elif data['request_type'] == 'sick':
                    remaining = float(employee.sick_hours_remaining)
                    logger.info(f"Sick hours remaining: {remaining}")
                    if hours_requested > remaining:
                        logger.info("Insufficient sick hours")
                        raise serializers.ValidationError({
                            'error': 'insufficient_hours',
                            'message': f"Not enough sick leave hours available. You have {remaining:.1f} hours remaining, but requested {hours_requested:.1f} hours.",
                            'hours_requested': hours_requested,
                            'hours_remaining': remaining
                        })

        return data

    def format_date_time(self, date, time=None):
        if time:
            return f"{date.strftime('%Y-%m-%d')} {time.strftime('%I:%M %p')}"
        return date.strftime('%Y-%m-%d')
