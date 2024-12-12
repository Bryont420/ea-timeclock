from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ObjectDoesNotExist
from ...models import Employee, TimeEntry, AdminProfile, Note
from ..serializers.employee_serializers import EmployeeSerializer
from ..serializers.time_entry_serializers import TimeEntrySerializer
from django.utils import timezone
from collections import defaultdict
from datetime import timedelta
from django.utils.timezone import localtime
import pytz
from django.db.models import Prefetch
import logging
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
import json
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# Get encryption key from environment variables
encryption_key = os.getenv('ENCRYPTION_KEY')
if not encryption_key:
    raise ValueError('ENCRYPTION_KEY environment variable is not set')

# The key is already in base64 format, decode it for use
ENCRYPTION_KEY = base64.b64decode(encryption_key)

def format_hours(hours):
    """Format hours into 'XH YM' format"""
    if hours is None:
        return '0H 0M'
    hours_part = int(hours)
    minutes_part = int((hours - hours_part) * 60)
    return f'{hours_part}H {minutes_part}M'

def parse_cryptojs_format(encrypted_data):
    """Parse CryptoJS format which includes salt and IV in the ciphertext"""
    try:
        # CryptoJS format is: "Salted__" + salt + iv + ciphertext
        data = base64.b64decode(encrypted_data)
        if not data.startswith(b'Salted__'):
            return None, None
        
        salt = data[8:16]
        iv = data[16:32]
        ciphertext = data[32:]
        return iv, ciphertext
    except Exception as e:
        logger.error(f"Error parsing CryptoJS format: {str(e)}")
        return None, None

@api_view(['POST'])
@permission_classes([])
def login_view(request):
    try:
        # Get encrypted data from request
        encrypted_data = request.data.get('encryptedData')
        iv = request.data.get('iv')
        
        if not all([encrypted_data, iv]):
            return Response({'error': 'Missing encryption parameters'}, status=400)

        try:
            # Decode base64 strings
            iv_bytes = base64.b64decode(iv)
            ciphertext = base64.b64decode(encrypted_data)
            
            # Create cipher for decryption
            cipher = AES.new(ENCRYPTION_KEY, AES.MODE_CBC, iv_bytes)
            
            # Decrypt and unpad
            decrypted_padded = cipher.decrypt(ciphertext)
            decrypted_data = unpad(decrypted_padded, AES.block_size)
            
            # Parse credentials
            credentials = json.loads(decrypted_data.decode('utf-8'))
            username = credentials.get('username')
            password = credentials.get('password')
            
            if not all([username, password]):
                return Response({'error': 'Invalid credentials format'}, status=400)
            
            # Authenticate
            user = authenticate(username=username, password=password)
            
            if user is not None:
                # Check if password change is required
                force_password_change = False
                if hasattr(user, 'employee'):
                    force_password_change = user.employee.force_password_change
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                
                # Return tokens and user info
                return Response({
                    'access': access_token,
                    'refresh': str(refresh),
                    'username': user.username,
                    'email': user.email,
                    'id': user.id,
                    'is_staff': user.is_staff,
                    'force_password_change': force_password_change
                })
            else:
                return Response({'error': 'Invalid credentials'}, status=401)
                
        except Exception as e:
            return Response({'error': 'Failed to process credentials'}, status=400)
            
    except Exception as e:
        return Response({'error': 'Authentication failed'}, status=401)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_info(request):
    try:
        employee = request.user.employee
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def time_entries(request):
    if request.method == 'GET':
        try:
            employee = request.user.employee
            
            # Get the date parameter, default to today
            date_param = request.GET.get('date', timezone.now().date().isoformat())
            target_date = timezone.datetime.strptime(date_param, '%Y-%m-%d').date()
            
            # Get the first day of the month
            start_of_month = target_date.replace(day=1)
            
            # Determine the day of the week for the start_of_month (Monday=0, Tuesday=1, ..., Sunday=6)
            weekday_of_start_of_month = start_of_month.weekday()
            
            # Adjust the start_of_month to the previous Thursday if necessary
            if weekday_of_start_of_month >= 3:
                adjusted_days = weekday_of_start_of_month - 3
            else:
                adjusted_days = weekday_of_start_of_month + 4

            adjusted_start_of_month = start_of_month - timedelta(days=adjusted_days)
            
            # Get the end of the month
            if start_of_month.month == 12:
                end_of_month = start_of_month.replace(year=start_of_month.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_of_month = start_of_month.replace(month=start_of_month.month + 1, day=1) - timedelta(days=1)
            
            # Convert to datetime in America/New_York timezone
            eastern = pytz.timezone('America/New_York')
            start_datetime = eastern.localize(timezone.datetime.combine(adjusted_start_of_month, timezone.datetime.min.time()))
            end_datetime = eastern.localize(timezone.datetime.combine(end_of_month, timezone.datetime.max.time()))
            
            # Prefetch related notes
            notes_prefetch = Prefetch(
                'notes',
                queryset=Note.objects.select_related('created_by').order_by('-created_at')
            )
            
            # Query time entries for the entire month
            entries = TimeEntry.objects.filter(
                employee=employee,
                clock_in_time__gte=start_datetime,
                clock_in_time__lte=end_datetime
            ).prefetch_related(notes_prefetch).order_by('clock_in_time')
            
            # Group entries by week (Thursday to Wednesday) and calculate weekly totals
            weekly_totals = defaultdict(float)
            for entry in entries:
                if entry.clock_out_time:
                    clock_in_time_local = localtime(entry.clock_in_time)
                    weekday = clock_in_time_local.weekday()
                    # Calculate start of work week (Thursday)
                    start_of_week = clock_in_time_local.date() - timedelta(days=(weekday - 3 if weekday >= 3 else weekday + 4))
                    
                    # Calculate hours worked
                    duration = localtime(entry.clock_out_time) - clock_in_time_local
                    hours_worked = duration.total_seconds() / 3600
                    weekly_totals[start_of_week.isoformat()] += hours_worked
            
            # Calculate total hours for the month
            total_hours = sum(weekly_totals.values())
            
            # Get the current clock-in status
            current_entry = TimeEntry.objects.filter(
                employee=employee,
                clock_out_time__isnull=True
            ).first()
            
            clocked_in = bool(current_entry)
            clock_in_time = localtime(current_entry.clock_in_time).strftime('%I:%M %p') if current_entry else None
            
            try:
                # Serialize the entries with total_hours context
                serializer = TimeEntrySerializer(entries, many=True, context={'total_hours': total_hours})
                
                # Format weekly totals using format_hours
                formatted_weekly_totals = {
                    week: format_hours(hours) for week, hours in weekly_totals.items()
                }
                
                response_data = {
                    'entries': serializer.data,
                    'total_hours': format_hours(total_hours),
                    'weekly_totals': formatted_weekly_totals,
                    'clocked_in': clocked_in,
                    'clock_in_time': clock_in_time
                }
                
                return Response(response_data)
            except Exception as e:
                # Return a basic response without notes if there's a serialization error
                basic_entries = [{
                    'id': entry.id,
                    'clock_in_time': entry.clock_in_time.isoformat(),
                    'clock_out_time': entry.clock_out_time.isoformat() if entry.clock_out_time else None,
                    'hours_worked': entry.hours_worked,
                    'hours_worked_display': format_hours(entry.hours_worked) if entry.hours_worked else '0H 0M',
                    'is_vacation': entry.is_vacation,
                    'is_sick': entry.is_sick,
                    'notes': []
                } for entry in entries]
                
                response_data = {
                    'entries': basic_entries,
                    'total_hours': format_hours(total_hours),
                    'weekly_totals': formatted_weekly_totals,
                    'clocked_in': clocked_in,
                    'clock_in_time': clock_in_time
                }
                return Response(response_data)
            
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=404)
        except Exception as e:
            return Response({
                'entries': [],
                'total_hours': format_hours(0),
                'weekly_totals': {},
                'clocked_in': False,
                'clock_in_time': None
            })
            
    elif request.method == 'POST':
        try:
            employee = request.user.employee
            action = request.data.get('action')
            
            if action == 'clock_in':
                if employee.clocked_in:
                    return Response({'error': 'Already clocked in'}, status=400)
                    
                # Create new time entry
                entry = TimeEntry.objects.create(
                    employee=employee,
                    clock_in_time=timezone.now()
                )
                employee.clocked_in = True
                employee.save()
                
                return Response({
                    'message': 'Clocked in successfully',
                    'clock_in_time': localtime(entry.clock_in_time).strftime('%I:%M %p')
                })
                
            elif action == 'clock_out':
                if not employee.clocked_in:
                    return Response({'error': 'Not clocked in'}, status=400)
                    
                # Find the open time entry and close it
                entry = TimeEntry.objects.filter(
                    employee=employee,
                    clock_out_time__isnull=True
                ).first()
                
                if entry:
                    entry.clock_out_time = timezone.now()
                    entry.save()
                    
                employee.clocked_in = False
                employee.save()
                
                return Response({'message': 'Clocked out successfully'})
                
            else:
                return Response({'error': 'Invalid action'}, status=400)
                
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def background_image(request):
    if request.method == 'GET':
        try:
            logger.info(f"Getting background image for user: {request.user.username} (is_staff: {request.user.is_staff})")
            
            if request.user.is_staff:
                # Get admin background
                admin_profile = request.user.adminprofile
                logger.info(f"Admin profile found, background: {admin_profile.background_image or 'None'}")
                if not admin_profile.background_image:
                    return Response({'background_image': None})
                return Response({'background_image': admin_profile.background_image})
            else:
                # Get employee background
                employee = request.user.employee
                logger.info(f"Employee profile found, background: {employee.background_image or 'None'}")
                if not employee.background_image:
                    return Response({'background_image': None})
                return Response({'background_image': employee.background_image})
        except (Employee.DoesNotExist, AdminProfile.DoesNotExist) as e:
            logger.error(f"Profile not found for user {request.user.username}: {str(e)}")
            return Response({'error': 'Profile not found'}, status=404)
        except Exception as e:
            logger.error(f"Unexpected error getting background: {str(e)}")
            return Response({'error': str(e)}, status=500)
    elif request.method == 'POST':
        try:
            background_image = request.data.get('background_image')
            logger.info(f"Updating background image for user: {request.user.username} (is_staff: {request.user.is_staff})")
            
            if not background_image:
                logger.warning("No background image provided in request")
                return Response({'error': 'No background image provided'}, status=400)

            if request.user.is_staff:
                admin_profile = request.user.adminprofile
                admin_profile.background_image = background_image
                admin_profile.save()
                logger.info("Successfully updated admin background image")
            else:
                employee = request.user.employee
                employee.background_image = background_image
                employee.save()
                logger.info("Successfully updated employee background image")
            return Response({'message': 'Background image updated successfully'})
        except (Employee.DoesNotExist, AdminProfile.DoesNotExist) as e:
            logger.error(f"Profile not found for user {request.user.username}: {str(e)}")
            return Response({'error': 'Profile not found'}, status=404)
        except Exception as e:
            logger.error(f"Error updating background image: {str(e)}")
            return Response({'error': str(e)}, status=500)
