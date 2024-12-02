from django.urls import path, include
from django.views.generic import RedirectView
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect

from .views.views import generate_pdf
from .views.employee_views import (
    timeclock_screen, clock_in, clock_out, check_status, clock_action,
	add_note_to_time_entry, employee_login, employee_info,
	employee_logout, force_password_change, change_background_ajax,
	send_employee_info_email
)
from .views.admin_views import (admin_login, admin_dashboard, week_view, who_is_in)
from .views.vacation_hours import (
    vacation_hours_list, reset_vacation_hours, add_vacation_entry
)
from .views.time_entry_views import (
add_holiday_entry, add_time_entry, edit_time_entry, remove_time_entry
)
from .views.employee_management import (
    add_employee, edit_employee, remove_employee, employee_management, reset_employee_password
)
from .views.staff_management import (
    edit_staff, admin_dashboard_show_admins, add_staff
)
from .views.sick_hours import (
    add_sick_time_entry, sick_hours_list, reset_sick_hours
)
from .views.rest_framework import employee_data
urlpatterns = [

    # Employee Views
    path('', RedirectView.as_view(url='employee-dashboard', permanent=True), name='home_redirect'),
    path('clock-in/', clock_in, name='clock_in'),
    path('clock-out/', clock_out, name='clock_out'),
    path('check-status/', check_status, name='check_status'),
    path('clock-action/', clock_action, name='clock_action'),
    path('employee-dashboard/', timeclock_screen, name='timeclock_screen'),
    path('employee-dashboard/login/', employee_login, name='employee_login'),
    path('employee-dashboard/info/', employee_info, name='employee_info'),
    path('employee-dashboard/logout/', employee_logout, name='employee_logout'),
    path('employee-dashboard/force-password-change/', force_password_change, name='force_password_change'),
    path('ajax/change-background/', change_background_ajax, name='change_background_ajax'),
    path('send-email/', send_employee_info_email, name='send_employee_info_email'),

    # Admin Views
    path('admin-dashboard/', admin_dashboard, name='admin_dashboard'),
    path('admin-login/', admin_login, name='admin_login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='admin_dashboard'), name='logout'),

    # Employee Management
    path('admin-dashboard/edit_employee/<int:employee_id>/', edit_employee, name='edit_employee'),
    path('admin-dashboard/add_employee/', add_employee, name='add_employee'),
    path('admin-dashboard/remove_employee/<int:employee_id>/', remove_employee, name='remove_employee'),
    path('admin-dashboard/employee-management/', employee_management, name='employee_management'),
    path('admin-dashboard/employee-management/<int:employee_id>/reset-password/', reset_employee_password, name='reset_employee_password'),

    # Time Entry Management
    path('admin-dashboard/edit_time_entry/<int:entry_id>/', edit_time_entry, name='edit_time_entry'),
    path('admin-dashboard/add_time_entry/', add_time_entry, name='add_time_entry'),
    path('admin-dashboard/remove-time-entry/<int:entry_id>/', remove_time_entry, name='remove_time_entry'),

    # Admin Staff Management
    path('admin-dashboard/add_staff/', add_staff, name='add_staff'),
    path('admin-dashboard/edit_staff/', edit_staff, name='edit_staff'),
    path('admin-dashboard/show-admins/', admin_dashboard_show_admins, name='admin_dashboard_show_admins'),

    #Vacation Hours URLs
    path('admin-dashboard/add-vacation-entry/', add_vacation_entry, name='add_vacation_entry'),
    path('admin-dashboard/vacation-hours/', vacation_hours_list, name='vacation_hours_list'),
    path('reset-vacation-hours/<int:employee_id>/', reset_vacation_hours, name='reset_vacation_hours'),

    # Sick Hours URLs
    path('admin-dashboard/sick-hours/', sick_hours_list, name='sick_hours_list'),
    path('admin-dashboard/add-sick-time-entry/', add_sick_time_entry, name='add_sick_time_entry'),
    path('reset-sick-hours/<int:employee_id>/', reset_sick_hours, name='reset_sick_hours'),

    # Additional Views
    path('generate_pdf/', generate_pdf, name='generate_pdf'),
    path('admin-dashboard/week-view/', week_view, name='week_view'),
    path('admin-dashboard/add-holiday-entry/', add_holiday_entry, name='add_holiday_entry'),
    path('who-is-in/', who_is_in, name='who_is_in'),
    path('add-note/', add_note_to_time_entry, name='add_note_to_time_entry'),
	
	#rest APi Views
	path('api/employee/<int:employee_id>/', employee_data),
	
    # Favicon and Debug Toolbar
    path('favicon.ico', RedirectView.as_view(url=settings.STATIC_URL + 'timeclock/favicon.ico', permanent=True)),
]
# Debug Toolbar in DEBUG mode
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
