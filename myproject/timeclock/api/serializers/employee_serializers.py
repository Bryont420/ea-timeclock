from rest_framework import serializers
from timeclock.models import Employee
from timeclock.api.utils import format_hours

class EmployeeSerializer(serializers.ModelSerializer):
    vacation_hours_allocated_display = serializers.SerializerMethodField()
    vacation_hours_used_display = serializers.SerializerMethodField()
    vacation_hours_remaining_display = serializers.SerializerMethodField()
    sick_hours_allocated_display = serializers.SerializerMethodField()
    sick_hours_used_display = serializers.SerializerMethodField()
    sick_hours_remaining_display = serializers.SerializerMethodField()
    vacation_hours_remaining = serializers.SerializerMethodField()
    sick_hours_remaining = serializers.SerializerMethodField()
    department_display = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'hire_date', 'years_employed',
            'vacation_hours_allocated', 'vacation_hours_used', 'vacation_hours_remaining',
            'sick_hours_allocated', 'sick_hours_used', 'sick_hours_remaining',
            'vacation_hours_allocated_display', 'vacation_hours_used_display', 'vacation_hours_remaining_display',
            'sick_hours_allocated_display', 'sick_hours_used_display', 'sick_hours_remaining_display',
            'department', 'department_display',
            'background_image'
        ]

    def get_vacation_hours_remaining(self, obj):
        allocated = obj.vacation_hours_allocated or 0
        used = obj.vacation_hours_used or 0
        return allocated - used

    def get_sick_hours_remaining(self, obj):
        allocated = obj.sick_hours_allocated or 0
        used = obj.sick_hours_used or 0
        return allocated - used

    def get_vacation_hours_allocated_display(self, obj):
        return format_hours(obj.vacation_hours_allocated)

    def get_vacation_hours_used_display(self, obj):
        return format_hours(obj.vacation_hours_used)

    def get_vacation_hours_remaining_display(self, obj):
        allocated = obj.vacation_hours_allocated or 0
        used = obj.vacation_hours_used or 0
        remaining = allocated - used
        return format_hours(remaining)

    def get_sick_hours_allocated_display(self, obj):
        return format_hours(obj.sick_hours_allocated)

    def get_sick_hours_used_display(self, obj):
        return format_hours(obj.sick_hours_used)

    def get_sick_hours_remaining_display(self, obj):
        allocated = obj.sick_hours_allocated or 0
        used = obj.sick_hours_used or 0
        remaining = allocated - used
        return format_hours(remaining)

    def get_department_display(self, obj):
        return obj.get_department_display()
