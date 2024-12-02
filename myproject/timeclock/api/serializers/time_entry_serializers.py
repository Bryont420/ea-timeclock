from rest_framework import serializers
from timeclock.models import TimeEntry, Note
from timeclock.api.utils import format_hours

class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ['note_text', 'created_at', 'created_by']

    def get_created_by(self, obj):
        if obj.created_by:
            return {'username': obj.created_by.username}
        return {'username': 'System'}

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
