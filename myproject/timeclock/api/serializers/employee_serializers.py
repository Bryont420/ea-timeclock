from rest_framework import serializers
from timeclock.models import Employee
from timeclock.api.utils import format_hours
from dateutil.relativedelta import relativedelta
from datetime import date

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
    years_employed = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=False)

    class Meta:
        model = Employee
        fields = [
            'id', 'first_name', 'last_name', 'clocked_in', 'hire_date',
            'employee_id', 'department', 'vacation_hours_allocated',
            'vacation_hours_used', 'sick_hours_allocated', 'sick_hours_used',
            'background_image', 'theme_id', 'email',
            'vacation_hours_allocated_display', 'vacation_hours_used_display', 'vacation_hours_remaining_display',
            'sick_hours_allocated_display', 'sick_hours_used_display', 'sick_hours_remaining_display',
            'department_display',
            'vacation_hours_remaining', 'sick_hours_remaining', 'years_employed'
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

    def get_years_employed(self, obj):
        if obj.hire_date:
            delta = relativedelta(date.today(), obj.hire_date)
            return float(f"{delta.years}.{delta.months}")
        return 0.0

    def update(self, instance, validated_data):
        # Update the email field on the related User model
        user_data = validated_data.pop('user', None)
        if user_data and 'email' in user_data:
            instance.user.email = user_data['email']
            instance.user.save()

        # Update other fields on the Employee instance if necessary
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        return instance
