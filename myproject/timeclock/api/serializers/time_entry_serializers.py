from rest_framework import serializers
from timeclock.models import TimeEntry, Note, Employee
from timeclock.api.utils import format_hours

class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ['note_text', 'created_at', 'created_by']

    def get_creator_name(self, user):
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

    def get_created_by(self, obj):
        return {'username': self.get_creator_name(obj.created_by)}

class TimeEntrySerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    hours_worked_display = serializers.SerializerMethodField()
    total_hours_display = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'clock_in_time', 'clock_out_time', 'hours_worked',
            'hours_worked_display', 'notes', 'is_vacation', 'is_sick',
            'total_hours_display'
        ]

    def get_hours_worked_display(self, obj):
        if obj.hours_worked is None:
            return '0H 0M'
        return format_hours(obj.hours_worked)

    def get_total_hours_display(self, obj):
        if 'total_hours' in self.context:
            return format_hours(self.context['total_hours'])
        return None
