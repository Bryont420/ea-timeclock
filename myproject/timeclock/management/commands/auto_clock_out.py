from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import time
from timeclock.models import Employee, TimeEntry, Note
from django.contrib.auth.models import User
from decimal import Decimal

class Command(BaseCommand):
    help = "Automatically clock out employees at 7 p.m. if they are still clocked in."

    def handle(self, *args, **kwargs):
        # Set the target clock-out time to 7 p.m. in the local timezone
        target_clock_out_time = timezone.localtime(timezone.now()).replace(hour=19, minute=0, second=0, microsecond=0)

        # Fetch the specific employee for testing
        clocked_in_employees = Employee.objects.filter(clocked_in=True)
        
        for employee in clocked_in_employees:
            # Find the most recent time entry with a missing clock-out time
            time_entry = TimeEntry.objects.filter(employee=employee, clock_out_time__isnull=True).order_by('-clock_in_time').first()
            system_user = User.objects.get(username="System")

            if time_entry:
                # Calculate hours worked based on the target clock-out time
                duration = (target_clock_out_time - time_entry.clock_in_time).total_seconds() / 3600.0
                time_entry.clock_out_time = target_clock_out_time
                time_entry.hours_worked = Decimal(round(duration, 2))
                time_entry.save()

                # Mark employee as clocked out
                employee.clocked_in = False
                employee.save()

                # Add a note to indicate the auto clock-out
                Note.objects.create(
                    time_entry=time_entry,
                    created_by=system_user,
                    note_text="Forgot to Clock Out"
                )

        self.stdout.write("Auto clock-out process completed for employees still clocked in.")
