from rest_framework import serializers
from django.contrib.auth.models import User
from ...models import Employee, TimeEntry, AdminProfile
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone
from ..utils import format_hours

class AdminEmployeeSerializer(serializers.ModelSerializer):
    years_employed = serializers.SerializerMethodField()
    vacation_hours_remaining = serializers.SerializerMethodField()
    sick_hours_remaining = serializers.SerializerMethodField()
    vacation_hours_allocated_display = serializers.SerializerMethodField()
    vacation_hours_used_display = serializers.SerializerMethodField()
    sick_hours_allocated_display = serializers.SerializerMethodField()
    sick_hours_used_display = serializers.SerializerMethodField()
    clocked_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = (
            'id',
            'employee_id',
            'first_name',
            'last_name',
            'hire_date',
            'years_employed',
            'vacation_hours_allocated',
            'vacation_hours_used',
            'vacation_hours_allocated_display',
            'vacation_hours_used_display',
            'vacation_hours_remaining',
            'sick_hours_allocated',
            'sick_hours_used',
            'sick_hours_allocated_display',
            'sick_hours_used_display',
            'sick_hours_remaining',
            'clocked_status'
        )

    def get_years_employed(self, obj):
        if not obj.hire_date:
            return 0
        today = date.today()
        years = today.year - obj.hire_date.year
        if today.month < obj.hire_date.month or (
            today.month == obj.hire_date.month and today.day < obj.hire_date.day
        ):
            years -= 1
        return years

    def get_vacation_hours_remaining(self, obj):
        allocated = obj.vacation_hours_allocated or 0
        used = obj.vacation_hours_used or 0
        remaining = allocated - used
        return format_hours(remaining)

    def get_sick_hours_remaining(self, obj):
        allocated = obj.sick_hours_allocated or 0
        used = obj.sick_hours_used or 0
        remaining = allocated - used
        return format_hours(remaining)

    def get_vacation_hours_allocated_display(self, obj):
        return format_hours(obj.vacation_hours_allocated)

    def get_vacation_hours_used_display(self, obj):
        return format_hours(obj.vacation_hours_used)

    def get_sick_hours_allocated_display(self, obj):
        return format_hours(obj.sick_hours_allocated)

    def get_sick_hours_used_display(self, obj):
        return format_hours(obj.sick_hours_used)

    def get_clocked_status(self, obj):
        # Get the current time in the system's timezone
        current_time = timezone.localtime()
        start_of_day = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Get the latest entry for today only
        latest_entry = obj.timeentry_set.filter(
            clock_in_time__gte=start_of_day,
            clock_in_time__lt=end_of_day
        ).order_by('-clock_in_time').first()

        if not latest_entry:
            return "Not Clocked In"
        if latest_entry.clock_out_time:
            return "Not Clocked In"
        return "Clocked In"

    def create(self, validated_data):
        # Create a new user for the employee if needed
        user = User.objects.create_user(
            username=validated_data['employee_id'],
            password='changeme',  # Default password that must be changed on first login
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        employee = Employee.objects.create(user=user, **validated_data)
        employee.force_password_change = True
        employee.save()
        return employee

    def update(self, instance, validated_data):
        # Update the associated user if it exists
        if instance.user:
            user = instance.user
            user.first_name = validated_data.get('first_name', user.first_name)
            user.last_name = validated_data.get('last_name', user.last_name)
            user.save()
        
        return super().update(instance, validated_data)

class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminProfile
        fields = ['background_image', 'theme_id']

class AdminTimeEntrySerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(write_only=True)
    employee_name = serializers.SerializerMethodField()
    total_hours = serializers.SerializerMethodField()
    entry_type = serializers.ChoiceField(choices=TimeEntry.ENTRY_TYPE_CHOICES, default='regular')
    clock_in_time_formatted = serializers.SerializerMethodField()
    clock_out_time_formatted = serializers.SerializerMethodField()
    entry_date = serializers.SerializerMethodField()
    hours_worked_display = serializers.SerializerMethodField()
    notes = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    notes_display = serializers.SerializerMethodField()
    notes_data = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = (
            'id',
            'employee_id',
            'employee_name',
            'clock_in_time',
            'clock_out_time',
            'entry_date',
            'clock_in_time_formatted',
            'clock_out_time_formatted',
            'hours_worked_display',
            'total_hours',
            'notes',
            'notes_display',
            'notes_data',
            'is_vacation',
            'is_sick',
            'is_holiday',
            'entry_type'
        )

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"

    def get_notes_display(self, obj):
        return [{
            'id': note.id,
            'note_text': note.note_text,
            'created_by': note.created_by.username if note.created_by else 'Unknown',
            'created_at': timezone.localtime(note.created_at).strftime('%Y-%m-%d %H:%M')
        } for note in obj.notes.all()]

    def get_notes_data(self, obj):
        return [{
            'id': note.id,
            'note_text': note.note_text,
            'created_by': note.created_by.username if note.created_by else 'Unknown',
            'created_at': timezone.localtime(note.created_at).strftime('%Y-%m-%d %H:%M')
        } for note in obj.notes.all()]

    def get_total_hours(self, obj):
        if obj.clock_out_time:
            return format_hours(obj.hours_worked)
        return None

    def get_entry_date(self, obj):
        if obj.clock_in_time:
            local_time = timezone.localtime(obj.clock_in_time)
            return local_time.strftime('%Y-%m-%d')
        return None

    def get_clock_in_time_formatted(self, obj):
        if obj.clock_in_time:
            local_time = timezone.localtime(obj.clock_in_time)
            return local_time.strftime('%I:%M %p')
        return None

    def get_clock_out_time_formatted(self, obj):
        if obj.clock_out_time:
            local_time = timezone.localtime(obj.clock_out_time)
            return local_time.strftime('%I:%M %p')
        return None

    def get_hours_worked_display(self, obj):
        return obj.hours_worked_admin_view()

    def create(self, validated_data):
        employee_id = validated_data.pop('employee_id')
        notes = validated_data.pop('notes', [])
        request = self.context.get('request')
        
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            validated_data['employee'] = employee
            instance = super().create(validated_data)
            
            # Create notes with the current user
            for note_data in notes:
                note_text = note_data.get('note_text', '').strip()
                if note_text:  
                    instance.notes.create(
                        note_text=note_text,
                        created_by=request.user if request else None
                    )
            
            # Update employee clocked-in status
            if instance.clock_in_time.date() == timezone.localtime(timezone.now()).date():
                employee.clocked_in = not bool(instance.clock_out_time)
                employee.save(update_fields=['clocked_in'])
            
            return instance
        except Employee.DoesNotExist:
            raise serializers.ValidationError({'employee_id': 'Employee not found'})

    def update(self, instance, validated_data):
        if 'employee_id' in validated_data:
            employee_id = validated_data.pop('employee_id')
            try:
                employee = Employee.objects.get(employee_id=employee_id)
                validated_data['employee'] = employee
            except Employee.DoesNotExist:
                raise serializers.ValidationError({'employee_id': 'Employee not found'})
        
        request = self.context.get('request')
        
        # Handle notes
        if 'notes' in validated_data:  
            notes = validated_data.pop('notes')
            # Add new notes with the current user
            for note_data in notes:
                note_text = note_data.get('note_text', '').strip()
                if note_text:  
                    instance.notes.create(
                        note_text=note_text,
                        created_by=request.user if request else None
                    )
        
        updated_instance = super().update(instance, validated_data)
        
        # Update employee clocked-in status
        if updated_instance.clock_in_time.date() == timezone.localtime(timezone.now()).date():
            updated_instance.employee.clocked_in = not bool(updated_instance.clock_out_time)
            updated_instance.employee.save(update_fields=['clocked_in'])
        
        return updated_instance
