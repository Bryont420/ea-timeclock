from rest_framework import serializers
from django.contrib.auth.models import User
from ...models import Employee, TimeEntry, Note
from ..utils import format_hours

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name')

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    vacation_hours_remaining = serializers.SerializerMethodField()
    sick_hours_remaining = serializers.SerializerMethodField()
    vacation_hours_allocated_display = serializers.SerializerMethodField()
    vacation_hours_used_display = serializers.SerializerMethodField()
    sick_hours_allocated_display = serializers.SerializerMethodField()
    sick_hours_used_display = serializers.SerializerMethodField()
    years_employed = serializers.FloatField(read_only=True)
    id = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = (
            'id', 'first_name', 'last_name', 'employee_id',
            'vacation_hours_allocated', 'vacation_hours_used',
            'vacation_hours_allocated_display', 'vacation_hours_used_display',
            'sick_hours_allocated', 'sick_hours_used',
            'sick_hours_allocated_display', 'sick_hours_used_display',
            'vacation_hours_remaining', 'sick_hours_remaining',
            'user', 'years_employed'
        )
    
    def get_id(self, obj):
        return obj.user.username if obj.user else str(obj.employee_id)

    def get_vacation_hours_remaining(self, obj):
        allocated = obj.vacation_hours_allocated
        used = obj.vacation_hours_used
        remaining = allocated - used if allocated and used else 0
        return format_hours(remaining)

    def get_sick_hours_remaining(self, obj):
        allocated = obj.sick_hours_allocated
        used = obj.sick_hours_used
        remaining = allocated - used if allocated and used else 0
        return format_hours(remaining)

    def get_vacation_hours_allocated_display(self, obj):
        return format_hours(obj.vacation_hours_allocated)

    def get_vacation_hours_used_display(self, obj):
        return format_hours(obj.vacation_hours_used)

    def get_sick_hours_allocated_display(self, obj):
        return format_hours(obj.sick_hours_allocated)

    def get_sick_hours_used_display(self, obj):
        return format_hours(obj.sick_hours_used)

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ('note_text',)

class TimeEntrySerializer(serializers.ModelSerializer):
    hours_worked_display = serializers.SerializerMethodField()
    clock_in_time_formatted = serializers.SerializerMethodField()
    clock_out_time_formatted = serializers.SerializerMethodField()
    notes = NoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = TimeEntry
        fields = (
            'id', 'clock_in_time', 'clock_out_time',
            'clock_in_time_formatted', 'clock_out_time_formatted',
            'hours_worked_display', 'is_vacation', 'is_sick', 'notes'
        )
    
    def get_hours_worked_display(self, obj):
        return obj.hours_worked_admin_view()
    
    def get_clock_in_time_formatted(self, obj):
        return obj.clock_in_time.strftime('%I:%M %p')
    
    def get_clock_out_time_formatted(self, obj):
        if obj.clock_out_time:
            return obj.clock_out_time.strftime('%I:%M %p')
        return None
