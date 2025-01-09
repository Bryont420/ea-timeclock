from django.db import models, transaction
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Sum, F
import pytz
import math
from django.contrib.auth.models import User
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging
logger = logging.getLogger(__name__)

class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    background_image = models.CharField(max_length=255, blank=True, null=True)
    theme_id = models.CharField(max_length=50, default='light')

@receiver(post_save, sender=User)
def create_admin_profile(sender, instance, created, **kwargs):
    if created and instance.is_staff:
        AdminProfile.objects.create(user=instance)
		
class Employee(models.Model):
    DEPARTMENT_CHOICES = [
        ('none', 'None'),
        ('print', 'Print'),
        ('embroidery', 'Embroidery'),
        ('engraving', 'Engraving'),
        ('fulfillment', 'Fulfillment'),
        ('shipping', 'Shipping / Receiving'),
        ('cs', 'Customer Service'),
        ('it', 'IT'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    clocked_in = models.BooleanField(default=False)
    hire_date = models.DateField(null=True, blank=True)
    employee_id = models.IntegerField(unique=True)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default='none')
    vacation_hours_allocated = models.DecimalField(max_digits=8, decimal_places=4, default=0.00)
    vacation_hours_used = models.DecimalField(max_digits=8, decimal_places=4, default=0.00)
    vacation_allocated_on_90_days = models.BooleanField(default=False)  # Track whether vacation has been allocated after 90 days
    sick_hours_allocated = models.DecimalField(max_digits=8, decimal_places=4, default=0.00)
    sick_hours_used = models.DecimalField(max_digits=8, decimal_places=4, default=0.00)
    initial_sick_hours_allocated = models.BooleanField(default=False)  # New field to track initial sick hours allocation
    last_reset_date = models.DateField(null=True, blank=True)
    force_password_change = models.BooleanField(default=False)
    background_image = models.CharField(max_length=255, null=True, blank=True)
    future_vacation_hours_used = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    future_sick_hours_used = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    theme_id = models.CharField(max_length=50, default='light')

    def __str__(self):
        return f"{self.first_name} {self.last_name} (ID: {self.employee_id})"

    @property
    def vacation_hours_remaining(self):
        return self.vacation_hours_allocated - self.vacation_hours_used
        
    @property
    def sick_hours_remaining(self):
        return self.sick_hours_allocated - self.sick_hours_used

    @property
    def years_employed(self):
        if self.hire_date:
            return relativedelta(date.today(), self.hire_date).years
        return 0


    @property
    def has_worked_90_days(self):
        if self.hire_date:
            return (date.today() - self.hire_date).days >= 90
        return False


    class Meta:
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['hire_date']),
        ]

class TimeEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ('regular', 'Regular'),
        ('vacation', 'Vacation'),
        ('sick', 'Sick Leave'),
        ('holiday', 'Holiday'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    clock_in_time = models.DateTimeField()
    clock_out_time = models.DateTimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=8, decimal_places=4, default=0.00)
    full_day = models.BooleanField(default=False)
    is_vacation = models.BooleanField(default=False)
    is_sick = models.BooleanField(default=False)
    is_holiday = models.BooleanField(default=False)
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES, default='regular')
    skip_hours_deduction = models.BooleanField(default=False)  # New field

    def hours_worked_admin_view(self):
        total_seconds = int(self.hours_worked * 3600)
        hours = total_seconds // 3600
        minutes = round((total_seconds % 3600) / 60)
        return f"{hours}H {minutes}M"

    @transaction.atomic
    def save(self, *args, **kwargs):
        tz = pytz.timezone('America/New_York')
    
        if self.clock_in_time and timezone.is_naive(self.clock_in_time):
            self.clock_in_time = tz.localize(self.clock_in_time)
        if self.clock_out_time and timezone.is_naive(self.clock_out_time):
            self.clock_out_time = tz.localize(self.clock_out_time)
    
        if self.clock_out_time:
            duration = (self.clock_out_time - self.clock_in_time).total_seconds() / 3600.0
            self.hours_worked = Decimal(round(duration, 2))
        else:
            self.hours_worked = Decimal('0.00')
    
        employee = Employee.objects.select_for_update().get(pk=self.employee.pk)
    
        if self.pk is not None:
            original_entry = TimeEntry.objects.get(pk=self.pk)
    
            if not self.skip_hours_deduction:
                if original_entry.is_vacation and original_entry.hours_worked != self.hours_worked:
                    employee.vacation_hours_used = F('vacation_hours_used') - original_entry.hours_worked + self.hours_worked
                elif not original_entry.is_vacation and self.is_vacation:
                    employee.vacation_hours_used = F('vacation_hours_used') + self.hours_worked
    
                if original_entry.is_sick and original_entry.hours_worked != self.hours_worked:
                    employee.sick_hours_used = F('sick_hours_used') - original_entry.hours_worked + self.hours_worked
                elif not original_entry.is_sick and self.is_sick:
                    employee.sick_hours_used = F('sick_hours_used') + self.hours_worked
        else:
            # Check if this is a future year entry
            current_year = timezone.now().year
            entry_year = self.clock_in_time.year
            is_future_year = entry_year > current_year

            if not self.skip_hours_deduction:
                if self.is_vacation:
                    if not is_future_year and employee.vacation_hours_remaining < self.hours_worked:
                        raise ValidationError("Not enough vacation hours available")
                    employee.vacation_hours_used = F('vacation_hours_used') + self.hours_worked
                if self.is_sick:
                    if not is_future_year and employee.sick_hours_remaining < self.hours_worked:
                        raise ValidationError("Not enough sick hours available")
                    employee.sick_hours_used = F('sick_hours_used') + self.hours_worked
    
        super().save(*args, **kwargs)
        employee.save()
    
        self.update_total_hours_for_day()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        employee = Employee.objects.select_for_update().get(pk=self.employee.pk)
    
        # Update vacation/sick hours if applicable
        if self.is_vacation:
            employee.vacation_hours_used = F('vacation_hours_used') - self.hours_worked
        if self.is_sick:
            employee.sick_hours_used = F('sick_hours_used') - self.hours_worked
            
        # Only update clocked_in status if this is today's entry and has no clock_out_time
        current_time = timezone.localtime()
        start_of_day = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        if (self.clock_in_time >= start_of_day and 
            self.clock_in_time < end_of_day and 
            not self.clock_out_time):
            employee.clocked_in = False
    
        employee.save()
        super().delete(*args, **kwargs)

    def update_total_hours_for_day(self):
        total_hours = TimeEntry.objects.filter(
            employee=self.employee,
            clock_in_time__date=self.clock_in_time.date(),
            is_sick=False
        ).aggregate(total_hours=Sum('hours_worked'))['total_hours'] or 0

        self.full_day = total_hours >= 8.0
        super().save(update_fields=['full_day'])

    def __str__(self):
        clock_in_date = self.clock_in_time.strftime('%Y-%m-%d %H:%M') if self.clock_in_time else 'N/A'
        employee_name = f"{self.employee.first_name} {self.employee.last_name}" if self.employee else 'Unknown'
        return f"{clock_in_date} - {employee_name}"

    class Meta:
        verbose_name = 'Time Entry'
        verbose_name_plural = 'Time Entries'
        indexes = [
            models.Index(fields=['employee']),
            models.Index(fields=['clock_in_time']),
            models.Index(fields=['is_sick']),
            models.Index(fields=['is_vacation']),
        ]


class Note(models.Model):
    time_entry = models.ForeignKey(TimeEntry, on_delete=models.CASCADE, related_name='notes')
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    note_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        creator_name = self.created_by.username if self.created_by else 'Employee'
        return f"Note by {creator_name} on {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        indexes = [
            models.Index(fields=['time_entry']),
            models.Index(fields=['created_by']),
        ]


class TimeOffRequest(models.Model):
    TYPE_CHOICES = [
        ('vacation', 'Vacation'),
        ('sick', 'Sick Leave'),
        ('unpaid', 'Unpaid Leave')
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('denied', 'Denied')
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_off_requests')
    request_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    hours_requested = models.DecimalField(max_digits=8, decimal_places=4)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    review_notes = models.TextField(blank=True, null=True)
    is_partial_day = models.BooleanField(default=False)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='reviewed_requests')
    review_date = models.DateTimeField(null=True, blank=True)
    calendar_event_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
        ]

    def save(self, *args, **kwargs):
        # Check if this is a new request being approved
        if self.pk is None and self.status == 'approved':
            self._handle_hours_allocation()
        # Check if an existing request is being approved
        elif self.pk and self.status == 'approved':
            original = TimeOffRequest.objects.get(pk=self.pk)
            if original.status != 'approved':
                self._handle_hours_allocation()
        
        self.clean()
        super().save(*args, **kwargs)

    def _handle_hours_allocation(self):
        from datetime import date
        today = date.today()
        next_year = today.year + 1
        is_future_request = self.start_date.year == next_year or self.end_date.year == next_year

        if is_future_request:
            if self.request_type == 'vacation':
                self.employee.future_vacation_hours_used += self.hours_requested
            elif self.request_type == 'sick':
                self.employee.future_sick_hours_used += self.hours_requested
        else:
            if self.request_type == 'vacation':
                self.employee.vacation_hours_used += self.hours_requested
            elif self.request_type == 'sick':
                self.employee.sick_hours_used += self.hours_requested
        
        self.employee.save()

    def clean(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("End date must be after start date")

        if self.is_partial_day:
            if self.start_date != self.end_date:
                raise ValidationError("For partial day requests, start and end date must be the same")
            if not (self.start_time and self.end_time):
                raise ValidationError("Start time and end time are required for partial day requests")
            if self.start_time >= self.end_time:
                raise ValidationError("End time must be after start time")

        # Check for overlapping requests
        if self.start_date and self.end_date:
            overlapping_query = {
                'employee': self.employee,
                'status__in': ['pending', 'approved'],
                'start_date__lte': self.end_date,
                'end_date__gte': self.start_date
            }
            
            overlapping = TimeOffRequest.objects.filter(**overlapping_query).exclude(pk=self.pk)
            
            if overlapping.exists():
                raise ValidationError("This request overlaps with an existing time off request")

    def __str__(self):
        if self.is_partial_day:
            return f"{self.employee} - {self.get_request_type_display()} ({self.start_date} {self.start_time}-{self.end_time})"
        return f"{self.employee} - {self.get_request_type_display()} ({self.start_date} to {self.end_date})"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expires_at

    class Meta:
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"


class BiometricCredential(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='biometric_credentials')
    credential_id = models.CharField(max_length=255, unique=True)
    public_key = models.TextField()
    sign_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'biometric_credentials'
        ordering = ['-created_at']

    def __str__(self):
        return f"Biometric credential for {self.user.username}"
