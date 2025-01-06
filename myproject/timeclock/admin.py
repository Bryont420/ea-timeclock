from django import forms
from django.contrib import admin
from .models import Employee, TimeEntry, Note, PasswordResetToken, BiometricCredential, PasswordResetAttempt
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from .models import AdminProfile, TimeOffRequest

# Define an inline admin descriptor for AdminProfile model
class AdminProfileInline(admin.StackedInline):
    model = AdminProfile
    can_delete = False
    verbose_name_plural = 'Admin Profile'
    # Specify any fields you want to display from AdminProfile
    fields = ['background_image', 'theme_id']  # List fields you want to show here
    readonly_fields = ['background_image']

# Extend the existing UserAdmin to include AdminProfile inline
class CustomUserAdmin(UserAdmin):
    inlines = [AdminProfileInline]

# Unregister the default User admin and re-register it with the customized one
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Define the custom actions
@admin.action(description='Mark selected employees as Clocked In')
def mark_as_clocked_in(modeladmin, request, queryset):
    queryset.update(clocked_in=True)

@admin.action(description='Mark selected employees as Clocked Out')
def mark_as_clocked_out(modeladmin, request, queryset):
    queryset.update(clocked_in=False)

@admin.action(description='Mark selected employees as NOT having Vacation allocated')
def vacation_not_allocated(modeladmin, request, queryset):
    queryset.update(vacation_allocated_on_90_days=False)
	
@admin.action(description='Mark selected employees as having Vacation allocated')
def vacation_allocated(modeladmin, request, queryset):
    queryset.update(vacation_allocated_on_90_days=True)
	
@admin.action(description='Mark selected employees as NOT having Sick allocated')
def sick_not_allocated(modeladmin, request, queryset):
    queryset.update(initial_sick_hours_allocated=False)

@admin.action(description='Mark selected employees as having Sick allocated')
def sick_allocated(modeladmin, request, queryset):
    queryset.update(initial_sick_hours_allocated=True)
	
@admin.action(description='Force Password Reset for selected Employees')
def password_changes(modeladmin, request, queryset):
    queryset.update(force_password_change=True)
	
# Customize the EmployeeAdmin
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'employee_id', 'clocked_in', 'theme_id', 
                   'vacation_hours_display', 'future_vacation_hours_display',
                   'sick_hours_display', 'future_sick_hours_display')
    list_filter = ('clocked_in', 'last_name', 'theme_id')
    search_fields = ('first_name', 'last_name', 'employee_id')
    readonly_fields = ('future_vacation_hours_used', 'future_sick_hours_used')

    # Register the custom actions
    actions = [mark_as_clocked_in, mark_as_clocked_out, vacation_not_allocated, vacation_allocated, sick_not_allocated, sick_allocated, password_changes]
    
    def get_queryset(self, request):
        # Get the default queryset
        qs = super().get_queryset(request)
        # Order by clocked_in (True first), then last_name alphabetically
        return qs.order_by('-clocked_in', 'last_name', 'first_name')

    def vacation_hours_display(self, obj):
        return f"{obj.vacation_hours_allocated - obj.vacation_hours_used:.2f} / {obj.vacation_hours_allocated:.2f}"
    vacation_hours_display.short_description = "Vacation Hours (Remaining/Total)"

    def future_vacation_hours_display(self, obj):
        return f"{obj.future_vacation_hours_used:.2f}"
    future_vacation_hours_display.short_description = "Future Vacation Hours Used"

    def sick_hours_display(self, obj):
        return f"{obj.sick_hours_allocated - obj.sick_hours_used:.2f} / {obj.sick_hours_allocated:.2f}"
    sick_hours_display.short_description = "Sick Hours (Remaining/Total)"

    def future_sick_hours_display(self, obj):
        return f"{obj.future_sick_hours_used:.2f}"
    future_sick_hours_display.short_description = "Future Sick Hours Used"

class NoteInlineForm(forms.ModelForm):
    class Meta:
        model = Note
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'created_by' in self.fields:
            self.fields['created_by'].widget = forms.HiddenInput()
        else:
            self.fields['created_by'] = forms.ModelChoiceField(
                queryset=User.objects.all(),
                widget=forms.HiddenInput()
            )

class NoteInline(admin.TabularInline):
    model = Note
    form = NoteInlineForm
    extra = 1
    readonly_fields = ('created_at', 'updated_at', 'created_by')

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, Note) and not instance.created_by:
                instance.created_by = request.user  # Assign the logged-in user as the creator
            # Debugging outputs
            instance.save()
        formset.save_m2m()

class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('employee', 'formatted_date', 'formatted_clock_in_time', 'formatted_clock_out_time', 'hours_worked_admin_view')
    list_filter = ('employee', 'clock_in_time')
    search_fields = ('employee__first_name', 'employee__last_name', 'clock_in_time')
    inlines = [NoteInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Apply ordering by clock_in_time (newest first) and then by employee's last name and first name
        return qs.select_related('employee').prefetch_related('notes__created_by').order_by('-clock_in_time', 'employee__last_name', 'employee__first_name')

    def save_related(self, request, form, formsets, change):
        for formset in formsets:
            for obj in formset.save(commit=False):
                if isinstance(obj, Note) and not obj.created_by:
                    obj.created_by = request.user
                obj.save()
        super().save_related(request, form, formsets, change)

    def formatted_date(self, obj):
        if obj.clock_in_time:
            local_tz = timezone.get_current_timezone()
            date_local = obj.clock_in_time.astimezone(local_tz)
            return date_local.strftime('%A, %B %d, %Y')
        return 'N/A'
    formatted_date.admin_order_field = 'clock_in_time'
    formatted_date.short_description = 'Date'

    def formatted_clock_in_time(self, obj):
        if obj.clock_in_time:
            local_tz = timezone.get_current_timezone()
            clock_in_time_local = obj.clock_in_time.astimezone(local_tz)
            return clock_in_time_local.strftime('%I:%M %p')
        return 'N/A'
    formatted_clock_in_time.admin_order_field = 'clock_in_time'
    formatted_clock_in_time.short_description = 'Clock In Time'

    def formatted_clock_out_time(self, obj):
        if obj.clock_out_time:
            local_tz = timezone.get_current_timezone()
            clock_out_time_local = obj.clock_out_time.astimezone(local_tz)
            return clock_out_time_local.strftime('%I:%M %p')
        return 'N/A'
    formatted_clock_out_time.admin_order_field = 'clock_out_time'
    formatted_clock_out_time.short_description = 'Clock Out Time'

    def hours_worked_admin_view(self, obj):
        return obj.hours_worked_admin_view()
    hours_worked_admin_view.short_description = 'Hours Worked'

class NoteAdmin(admin.ModelAdmin):
    list_display = ('time_entry', 'created_by', 'created_at', 'updated_at', 'note_text')
    list_filter = ('created_by', 'created_at', 'updated_at')
    search_fields = ('note_text', 'time_entry__employee__first_name', 'time_entry__employee__last_name')
    readonly_fields = ('created_at', 'updated_at', 'created_by')

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('created_by', 'time_entry', 'time_entry__employee').order_by('-time_entry__clock_in_time', 'time_entry__employee__last_name', 'time_entry__employee__first_name')

class TimeOffRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'request_type', 'start_date', 'end_date', 'hours_requested', 'status', 'reviewed_by', 'review_date')
    list_filter = ('request_type', 'status', 'start_date', 'end_date', 'created_at')
    search_fields = ('employee__first_name', 'employee__last_name', 'reason', 'review_notes')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        # Optimize queryset to reduce database queries
        qs = super().get_queryset(request)
        return qs.select_related('employee', 'reviewed_by').order_by('-created_at')
    
    def save_model(self, request, obj, form, change):
        # Automatically set the reviewer if the request is reviewed
        if obj.status in ['approved', 'denied'] and not obj.reviewed_by:
            obj.reviewed_by = request.user
            obj.review_date = timezone.now()
        super().save_model(request, obj, form, change)

class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'expires_at')
    search_fields = ('user__username', 'token')

class BiometricCredentialAdmin(admin.ModelAdmin):
    list_display = ('user', 'credential_id', 'created_at', 'last_used')
    list_filter = ('created_at', 'last_used')
    search_fields = ('user__username', 'credential_id')
    readonly_fields = ('created_at', 'last_used')

    def get_queryset(self, request):
        return super().get_queryset(request)

from django.contrib import admin
from django.utils import timezone
from .models import PasswordResetAttempt

@admin.register(PasswordResetAttempt)
class PasswordResetAttemptAdmin(admin.ModelAdmin):
    list_display = [
        'ip_address',
        'attempt_time',
        'ban_trigger',
        'formatted_ban_level',
        'is_banned',
        'ban_end',
        'attempts_in_minute',
        'attempts_in_hour',
        'attempts_in_day',
        'attempts_in_week',
        'grace_period_end',
        'grace_period_remaining',
    ]
    list_filter = [
        ('ban_level', admin.EmptyFieldListFilter),
        'ip_address', 
        'attempt_time'
    ]
    search_fields = ['ip_address']
    readonly_fields = [
        'ip_address',
        'attempt_time',
        'attempt_type',
        'ban_level',
        'formatted_ban_level',
        'ban_end',
        'attempts_in_minute',
        'attempts_in_hour',
        'attempts_in_day',
        'attempts_in_week',
        'grace_period_end',
        'grace_period_remaining',
        'is_banned',
        'ban_trigger',
    ]

    def get_queryset(self, request):
        # Only show ban records, ordered by most recent first
        return super().get_queryset(request).filter(
            attempt_type='ban'
        ).order_by('-attempt_time')

    def formatted_ban_level(self, obj):
        if not obj.ban_level:
            return '-'
        
        durations = {
            1: '10 mins',
            2: '1 hr',
            3: '1 day',
            4: 'Permanent'
        }
        duration = durations.get(obj.ban_level, 'Unknown')
        return f'{obj.ban_level} ({duration})'
    formatted_ban_level.short_description = 'Ban Level'

    def ban_trigger(self, obj):
        # Get the attempt right before this ban to see what triggered it
        previous_attempt = PasswordResetAttempt.objects.filter(
            ip_address=obj.ip_address,
            attempt_time__lt=obj.attempt_time
        ).exclude(
            attempt_type='ban'
        ).order_by('-attempt_time').first()

        trigger_type = previous_attempt.attempt_type if previous_attempt else 'Unknown'
        trigger_type = trigger_type.replace('_', ' ').title()
        return f'Ban Record ({trigger_type})'
    ban_trigger.short_description = 'Ban Type'

    def attempts_in_minute(self, obj):
        now = timezone.now()
        count = PasswordResetAttempt.objects.filter(
            ip_address=obj.ip_address,
            attempt_time__gte=now - timezone.timedelta(minutes=1)
        ).count()
        return count
    attempts_in_minute.short_description = 'Attempts (1m)'

    def attempts_in_hour(self, obj):
        now = timezone.now()
        count = PasswordResetAttempt.objects.filter(
            ip_address=obj.ip_address,
            attempt_time__gte=now - timezone.timedelta(hours=1)
        ).count()
        return count
    attempts_in_hour.short_description = 'Attempts (1h)'

    def attempts_in_day(self, obj):
        now = timezone.now()
        count = PasswordResetAttempt.objects.filter(
            ip_address=obj.ip_address,
            attempt_time__gte=now - timezone.timedelta(days=1)
        ).count()
        return count
    attempts_in_day.short_description = 'Attempts (1d)'

    def attempts_in_week(self, obj):
        now = timezone.now()
        count = PasswordResetAttempt.objects.filter(
            ip_address=obj.ip_address,
            attempt_time__gte=now - timezone.timedelta(weeks=1)
        ).count()
        return count
    attempts_in_week.short_description = 'Attempts (1w)'

    def grace_period_end(self, obj):
        if obj.ban_level != 3:
            return '-'
        if obj.ban_end:
            return obj.ban_end + timezone.timedelta(days=6)  # 7 day grace period
        return '-'
    grace_period_end.short_description = 'Grace Period End'

    def grace_period_remaining(self, obj):
        if obj.ban_level != 3:
            return '-'
        grace_end = self.grace_period_end(obj)
        if grace_end != '-':
            now = timezone.now()
            if now < grace_end:
                return grace_end - now
            return 'Expired'
        return '-'
    grace_period_remaining.short_description = 'Grace Period Remaining'

    def is_banned(self, obj):
        return obj.is_banned
    is_banned.boolean = True
    is_banned.short_description = 'Currently Banned'

    actions = ['remove_ban']

    def remove_ban(self, request, queryset):
        queryset.update(ban_level=None, ban_start=None, ban_end=None)
    remove_ban.short_description = "Remove ban from selected attempts"

admin.site.register(Note, NoteAdmin)
admin.site.register(Employee, EmployeeAdmin)
admin.site.register(TimeEntry, TimeEntryAdmin)
admin.site.register(TimeOffRequest, TimeOffRequestAdmin)
admin.site.register(PasswordResetToken, PasswordResetTokenAdmin)
admin.site.register(BiometricCredential, BiometricCredentialAdmin)
