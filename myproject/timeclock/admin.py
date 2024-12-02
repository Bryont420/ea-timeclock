from django import forms
from django.contrib import admin
from .models import Employee, TimeEntry, Note
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
    fields = ['background_image']  # List fields you want to show here
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
    list_display = ('first_name', 'last_name', 'employee_id', 'clocked_in')
    list_filter = ('clocked_in', 'last_name')
    search_fields = ('first_name', 'last_name', 'employee_id')

    # Register the custom actions
    actions = [mark_as_clocked_in, mark_as_clocked_out, vacation_not_allocated, vacation_allocated, sick_not_allocated, sick_allocated, password_changes]
	
    def get_queryset(self, request):
        # Get the default queryset
        qs = super().get_queryset(request)
        # Order by clocked_in (True first), then last_name alphabetically
        return qs.order_by('-clocked_in', 'last_name', 'first_name')

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

    # Removed the 'get_current_user' method and related code since it's not needed

	
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

# Define the admin class for TimeOffRequest
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

# Register the TimeOffRequest model with the custom admin class
admin.site.register(TimeOffRequest, TimeOffRequestAdmin)

admin.site.register(Note, NoteAdmin)
admin.site.register(Employee, EmployeeAdmin)
admin.site.register(TimeEntry, TimeEntryAdmin)
