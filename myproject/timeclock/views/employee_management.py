from django.shortcuts import render, get_object_or_404, redirect  # For rendering views and fetching objects
from django.http import JsonResponse  # For returning JSON responses
from django.contrib.auth.decorators import login_required  # For login restrictions on views
from django.views.decorators.http import require_POST, require_http_methods  # For limiting HTTP methods
from django.contrib.auth.models import User  # Import the User model
from ..models import Employee  # Import the Employee model
from django.contrib.auth.hashers import make_password
from datetime import datetime
from django.conf import settings
from django.db import transaction, IntegrityError
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.response import Response
from rest_framework import status

# Create a logger
logger = logging.getLogger(__name__)

# Employee Management View
@login_required
def employee_management(request):
    if not request.user.is_staff:
        return redirect('admin_login')
    employees = Employee.objects.all()
    department_choices = Employee.DEPARTMENT_CHOICES
    return render(request, 'employee_management.html', {
        'employees': employees,
        'department_choices': department_choices
    })

# Add Employee View
@login_required
@require_POST
def add_employee(request):
    if request.headers.get('x-requested-with') != 'XMLHttpRequest':
        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)

    first_name = request.POST.get('first_name')
    last_name = request.POST.get('last_name')
    employee_id = request.POST.get('employee_id')
    hire_date_str = request.POST.get('hire_date')
    department = request.POST.get('department')

    if not first_name or not last_name or not employee_id:
        return JsonResponse({'success': False, 'error': 'Missing fields'}, status=400)

    if Employee.objects.filter(employee_id=employee_id).exists():
        return JsonResponse({'success': False, 'error': 'Employee ID already exists'}, status=400)

    # Parse the hire_date string to a date object, if provided
    hire_date = None
    if hire_date_str:
        try:
            hire_date = datetime.strptime(hire_date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'success': False, 'error': 'Invalid hire date format'}, status=400)

    # Create the User account with the default password
    default_password = '1831EAPromos!'  # Default password
    username = employee_id

    if User.objects.filter(username=username).exists():
        return JsonResponse({'success': False, 'error': 'Username already exists.'}, status=400)

    try:
        with transaction.atomic():
            # Create user
            user = User.objects.create_user(
                username=username,
                password=default_password,
                first_name=first_name,
                last_name=last_name
            )

            # Create employee
            employee = Employee.objects.create(
                user=user,
                first_name=first_name,
                last_name=last_name,
                employee_id=employee_id,
                hire_date=hire_date,
                department=department,
                force_password_change=True
            )

            return JsonResponse({'success': True})
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Edit Employee View
@login_required
@require_http_methods(["GET", "POST"])
def edit_employee(request, employee_id):
    if request.headers.get('x-requested-with') != 'XMLHttpRequest':
        return JsonResponse({'status': 'error', 'message': 'Invalid access method'}, status=403)

    if request.method == 'GET':
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            return JsonResponse({
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'employee_id': employee.employee_id,
                'hire_date': employee.hire_date.strftime('%Y-%m-%d') if employee.hire_date else None,
                'department': employee.department,
            })
        except Exception as e:
            logger.error(f"Error fetching employee: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    if request.method == 'POST':
        try:
            employee = get_object_or_404(Employee, id=employee_id)
            
            first_name = request.POST.get('first_name')
            last_name = request.POST.get('last_name')
            employee_id_new = request.POST.get('employee_id')
            hire_date_str = request.POST.get('hire_date')
            department = request.POST.get('department')

            if not first_name or not last_name or not employee_id_new:
                return JsonResponse({'success': False, 'error': 'Missing fields'}, status=400)

            # Check if new employee_id exists and it's not the current employee
            if Employee.objects.filter(employee_id=employee_id_new).exclude(id=employee_id).exists():
                return JsonResponse({'success': False, 'error': 'Employee ID already exists'}, status=400)

            # Parse the hire_date string to a date object, if provided
            if hire_date_str:
                try:
                    hire_date = datetime.strptime(hire_date_str, '%Y-%m-%d').date()
                except ValueError:
                    return JsonResponse({'success': False, 'error': 'Invalid hire date format'}, status=400)
            else:
                hire_date = None

            with transaction.atomic():
                # Update employee
                employee.first_name = first_name
                employee.last_name = last_name
                employee.employee_id = employee_id_new
                employee.hire_date = hire_date
                employee.department = department
                employee.save()

                # Update associated user
                employee.user.first_name = first_name
                employee.user.last_name = last_name
                employee.user.username = employee_id_new
                employee.user.save()

                return JsonResponse({'success': True})
        except Exception as e:
            logger.error(f"Error updating employee: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

# Reset Employee Password View 
@login_required
@require_POST
def reset_employee_password(request, employee_id):
    try:
        employee = get_object_or_404(Employee, id=employee_id)
        user = employee.user
        default_password = settings.DEFAULT_EMPLOYEE_PASSWORD  # Access the password from settings
        user.set_password(default_password)
        user.save()

        # Mark that the employee needs to change their password
        employee.force_password_change = True
        employee.save()

        return JsonResponse({'success': True, 'message': 'Password has been reset to the default value.'})
    except Exception as e:
        logger.error(f"Error resetting employee password: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# Remove Employee View
@login_required
@require_POST
def remove_employee(request, employee_id):
    try:
        # Fetch the employee object
        employee = get_object_or_404(Employee, id=employee_id)
        
        # Store the associated user before deleting the employee
        user = employee.user
        
        # Delete the employee
        employee.delete()
        
        # Delete the associated user
        user.delete()

        return JsonResponse({'success': True})
    except Exception as e:
        logger.error(f"Error removing employee: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
