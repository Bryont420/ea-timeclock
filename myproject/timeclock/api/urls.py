from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView
from .views.time_off_views import TimeOffRequestViewSet
from .views.admin_views import AdminEmployeeViewSet
from .views.time_entry_views import AdminTimeEntryViewSet
from .views.admin_time_entry_views import (
    add_vacation_entry,
    add_sick_time_entry,
    add_holiday_entry
)
from .views.base_views import (
    login_view,
    employee_info,
    time_entries,
    background_image
)
from .views.auth_views import logout_view
from .views import theme_views
from .views.email_update_view import EmailUpdateView
from .views.password_reset import request_password_reset, reset_password
from .views.biometric_views import BiometricLoginView, BiometricRegistrationView

router = routers.DefaultRouter()
router.register(r'time-off-requests', TimeOffRequestViewSet, basename='time-off-request')
router.register(r'admin/employees', AdminEmployeeViewSet, basename='admin-employee')
router.register(r'admin/time-entries', AdminTimeEntryViewSet, basename='admin-time-entry')

urlpatterns = [
    path('login/', login_view, name='api_login'),
    path('logout/', logout_view, name='api_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('employee/info/', employee_info, name='api_employee_info'),
    path('employee/time-entries/', time_entries, name='api_time_entries'),
    path('employee/background-image/', background_image, name='api_background_image'),
    # Admin time entry type-specific endpoints
    path('admin/time-entries/vacation/', add_vacation_entry, name='api_add_vacation_entry'),
    path('admin/time-entries/sick/', add_sick_time_entry, name='api_add_sick_time_entry'),
    path('admin/time-entries/holiday/', add_holiday_entry, name='api_add_holiday_entry'),
    # Theme preferences endpoints
    path('user/preferences/theme/', theme_views.get_theme_preference, name='get_theme_preference'),
    path('user/preferences/theme/update/', theme_views.update_theme_preference, name='update_theme_preference'),
    path('employee/email/update/', EmailUpdateView.as_view(), name='email-update'),
    path('password-reset/request/', request_password_reset, name='request_password_reset'),
    path('password-reset/reset/<str:token>/', reset_password, name='reset_password'),
    # Biometric Authentication
    path('auth/biometric-login/', BiometricLoginView.as_view(), name='biometric-login'),
    path('auth/biometric-register/', BiometricRegistrationView.as_view(), name='biometric-register'),
] + router.urls
