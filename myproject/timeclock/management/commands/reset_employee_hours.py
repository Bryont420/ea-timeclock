from django.core.management.base import BaseCommand
from django.db import transaction
from timeclock.models import Employee
from datetime import date, datetime
from decimal import Decimal

class Command(BaseCommand):
    help = 'Reset vacation and sick hours for employees on January 1st and allocate vacation after 90 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-date',
            help='Test date in YYYY-MM-DD format (for testing purposes)',
        )
        parser.add_argument(
            '--employee-id',
            type=int,
            help='Specific employee ID to reset (for testing purposes)',
        )
        parser.add_argument(
            '--force-reset',
            action='store_true',
            help='Force reset regardless of last reset date (for testing purposes)',
        )

    def handle(self, *args, **kwargs):
        test_date = kwargs.get('test_date')
        employee_id = kwargs.get('employee_id')
        force_reset = kwargs.get('force_reset', False)
        
        if test_date:
            try:
                today = datetime.strptime(test_date, '%Y-%m-%d').date()
                self.stdout.write(f"Running with test date: {today}")
            except ValueError:
                self.stdout.write(self.style.ERROR('Invalid date format. Use YYYY-MM-DD'))
                return
        else:
            today = date.today()

        with transaction.atomic():
            if employee_id:
                employees = Employee.objects.select_for_update().filter(employee_id=employee_id)
                if not employees.exists():
                    self.stdout.write(self.style.ERROR(f'No employee found with ID {employee_id}'))
                    return
            else:
                employees = Employee.objects.select_for_update().all()

            for employee in employees:
                # Show current hours before reset
                self.stdout.write(f"\nEmployee: {employee.first_name} {employee.last_name} (ID: {employee.employee_id})")
                self.stdout.write(f"Before reset:")
                self.stdout.write(f"  Vacation: {employee.vacation_hours_allocated} allocated, {employee.vacation_hours_used} used")
                self.stdout.write(f"  Sick: {employee.sick_hours_allocated} allocated, {employee.sick_hours_used} used")
                self.stdout.write(f"  Future vacation hours used: {employee.future_vacation_hours_used}")
                self.stdout.write(f"  Future sick hours used: {employee.future_sick_hours_used}")

                if force_reset:
                    self.stdout.write("Forcing reset due to --force-reset flag")
                    # Set last_reset_date to previous year to force reset
                    employee.last_reset_date = date(today.year - 1, 12, 31)
                    employee.save()

                # Allocate sick time for new employees immediately if it hasn't been allocated before
                if not employee.initial_sick_hours_allocated:
                    employee.sick_hours_allocated = Decimal('18.00')
                    employee.initial_sick_hours_allocated = True
                    employee.save()
                    self.stdout.write(f"Sick hours allocated for new employee: {employee.first_name} {employee.last_name}")

                # Allocate vacation time if the employee has passed 90 days and hasn't been allocated yet
                if employee.has_worked_90_days and not employee.vacation_allocated_on_90_days:
                    self.allocate_vacation_on_90_days(employee)

                # Reset vacation and sick hours
                if not employee.last_reset_date or employee.last_reset_date.year < today.year:
                    self.reset_hours(employee, today)
                    
                    # Show hours after reset
                    self.stdout.write(f"\nAfter reset:")
                    self.stdout.write(f"  Vacation: {employee.vacation_hours_allocated} allocated, {employee.vacation_hours_used} used")
                    self.stdout.write(f"  Sick: {employee.sick_hours_allocated} allocated, {employee.sick_hours_used} used")
                    self.stdout.write(f"  Future vacation hours used: {employee.future_vacation_hours_used}")
                    self.stdout.write(f"  Future sick hours used: {employee.future_sick_hours_used}")
                else:
                    self.stdout.write(f"\nNo reset needed - last reset was {employee.last_reset_date}")

    def reset_hours(self, employee, today):
        # Determine years employed
        hire_date_this_year = employee.hire_date.replace(year=today.year) if employee.hire_date else None

        if hire_date_this_year and today >= hire_date_this_year:
            years_employed = today.year - employee.hire_date.year
        else:
            years_employed = today.year - employee.hire_date.year - 1

        # Allocate sick time (always 18 hours)
        employee.sick_hours_allocated = Decimal('18.00')

        # Allocate vacation time based on years employed
        if 0 <= years_employed < 5:  # 0 - 4 Years = 1 week
            employee.vacation_hours_allocated = Decimal('40.00')
        elif 5 <= years_employed < 10:  # 5 - 9 Years = 2 Weeks
            employee.vacation_hours_allocated = Decimal('80.00')
        else:  # 10+ years = 3 Weeks
            employee.vacation_hours_allocated = Decimal('120.00')

        # Apply any pre-approved future time off requests
        employee.vacation_hours_used = employee.future_vacation_hours_used
        employee.sick_hours_used = employee.future_sick_hours_used

        # Reset future hours tracking
        employee.future_vacation_hours_used = Decimal('0.00')
        employee.future_sick_hours_used = Decimal('0.00')

        # Check if it's the first time setting the reset date
        is_initial_reset = employee.last_reset_date is None

        # Update last reset date
        employee.last_reset_date = today
        employee.save()

        # Only show a reset message if it was not the initial setting
        if not is_initial_reset:
            self.stdout.write(f"Vacation and sick hours reset for {employee.first_name} {employee.last_name}")
            if employee.vacation_hours_used > 0 or employee.sick_hours_used > 0:
                self.stdout.write(f"  - Applied pre-approved time off: Vacation: {employee.vacation_hours_used} hours, Sick: {employee.sick_hours_used} hours")

    def allocate_vacation_on_90_days(self, employee):
        # Allocate vacation time after 90 days, consistent with yearly reset rules
        years_employed = employee.years_employed

        if 0 <= years_employed < 5:  # 0 - 4 Years = 1 week
            employee.vacation_hours_allocated = Decimal('40.00')
        elif 5 <= years_employed < 10:  # 5 - 9 Years = 2 Weeks
            employee.vacation_hours_allocated = Decimal('80.00')
        else:  # 10+ years = 3 Weeks
            employee.vacation_hours_allocated = Decimal('120.00')

        employee.vacation_allocated_on_90_days = True
        employee.save()

        self.stdout.write(f"Employee {employee.first_name} {employee.last_name} has now worked 90 days and has been granted Vacation Time")
