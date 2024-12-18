from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.conf import settings
from ...models import TimeOffRequest, Employee, TimeEntry, Note
from ..serializers import TimeOffRequestSerializer
from ...views.email_helpers import send_shared_mail_async
import json
import logging
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
from datetime import time, timedelta
from decimal import Decimal
from rest_framework.exceptions import ValidationError
import aiohttp
import asyncio
import ssl
import certifi
from asgiref.sync import async_to_sync, sync_to_async

logger = logging.getLogger(__name__)

class TimeOffRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeOffRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TimeOffRequest.objects.all()

    def get_queryset(self):
        try:
            if self.request.user.is_staff:
                # Admins see all requests
                return self.queryset.order_by('-start_date')
            else:
                # Regular users see all their own requests
                try:
                    employee = self.request.user.employee
                    return self.queryset.filter(employee=employee).order_by('-start_date')
                except Employee.DoesNotExist:
                    return TimeOffRequest.objects.none()
        except Exception:
            return TimeOffRequest.objects.none()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            try:
                employee = request.user.employee
                if not request.user.is_staff:
                    # Regular users can only modify their own pending requests
                    if obj.employee.id != employee.id:
                        raise PermissionDenied("You can only modify your own requests")
                    if obj.status != 'pending':
                        raise PermissionDenied("You can only modify pending requests")
            except Employee.DoesNotExist:
                raise PermissionDenied("Employee profile not found")

    def perform_update(self, serializer):
        try:
            instance = serializer.instance
            if not self.request.user.is_staff and instance.status != 'pending':
                raise PermissionDenied("You can only modify pending requests")
            serializer.save()
        except Exception:
            raise

    def perform_destroy(self, instance):
        try:
            if not self.request.user.is_staff and instance.status != 'pending':
                raise PermissionDenied("You can only delete pending requests")
            instance.delete()
        except Exception:
            raise

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception:
            return Response([], status=status.HTTP_200_OK)  # Return empty list on error

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Use async_to_sync to call our async perform_create
            instance = async_to_sync(self.perform_create)(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            return Response(
                {"error": "server_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    async def perform_create(self, serializer):
        try:
            # Wrap database operations with sync_to_async
            employee = await sync_to_async(getattr)(self.request.user, 'employee')
            save_serializer = sync_to_async(serializer.save)
            instance = await save_serializer(employee=employee)
            
            # Send notification email to admins asynchronously
            subject = f'EA Promos Time Clock System - New Time Off Request'
            message = f'''
                <h2>New Time Off Request Submitted</h2>
                <p>Hello,</p>
                <p>A new time off request has been submitted and requires your review.</p>
                <br>
                <p><strong>Request Details:</strong></p>
                <p><strong>Employee:</strong> {employee.first_name} {employee.last_name}</p>
                <p><strong>Request Type:</strong> {instance.get_request_type_display()}</p>
                <p><strong>Start Date:</strong> {instance.start_date}</p>
                <p><strong>End Date:</strong> {instance.end_date}</p>
                <p><strong>Hours Requested:</strong> {instance.hours_requested}</p>
                <p><strong>Reason:</strong> {instance.reason}</p>
                <br>
                <p>Please review this request at your earliest convenience.</p>
                <br>
                <p>Best regards,</p>
                <p>EA Promos Management Team</p>
            '''
            
            # Send to all admin emails asynchronously
            email_tasks = []
            for admin_email in settings.ADMIN_NOTIFICATION_EMAILS:
                email_tasks.append(
                    send_shared_mail_async(
                        admin_email,
                        subject,
                        message
                    )
                )

            # Run all email tasks concurrently and collect results
            if email_tasks:
                results = await asyncio.gather(*email_tasks, return_exceptions=True)
                # Log any failed emails
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(f"Failed to send email to {settings.ADMIN_NOTIFICATION_EMAILS[i]}: {str(result)}")
                    
            return instance
                    
        except Employee.DoesNotExist:
            raise PermissionDenied("Employee profile not found")
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            raise

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_update(serializer)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": "server_error", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        try:
            time_off_request = self.get_object()
            action = request.data.get('action')
            review_notes = request.data.get('review_notes', '')

            if action not in ['approve', 'deny']:
                return Response({"detail": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

            # Update request fields
            time_off_request.status = 'approved' if action == 'approve' else 'denied'
            time_off_request.review_notes = review_notes
            time_off_request.reviewed_by = request.user
            time_off_request.review_date = timezone.now()

            # Save first to ensure we have a valid instance
            time_off_request.save()

            # Run the async operations
            try:
                # Process time entries if needed
                if action == 'approve' and time_off_request.request_type in ['vacation', 'sick']:
                    async_to_sync(self._process_time_entries)(time_off_request)

                # Add to calendar if approved
                if action == 'approve':
                    calendar_result = async_to_sync(self._add_to_calendar_async)(time_off_request)
                    if not calendar_result:
                        logger.error("Failed to add event to calendar")

                # Send review notification
                email_result = async_to_sync(self._send_review_notification_async)(time_off_request)
                if not email_result:
                    logger.error("Failed to send review notification email")

            except Exception as e:
                logger.error(f"Error in async operations: {str(e)}")
                # Don't raise as we've already saved the main update

            return Response({'status': 'success'})

        except Exception as e:
            logger.error(f"Error in review action: {str(e)}")
            return Response(
                {'detail': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    async def _send_review_notification_async(self, time_off_request):
        try:
            # Get employee and email using sync_to_async
            employee = await sync_to_async(getattr)(time_off_request, 'employee')
            user = await sync_to_async(getattr)(employee, 'user')
            email = await sync_to_async(getattr)(user, 'email')
            
            if not email:
                logger.error("No email found for employee")
                return False

            # Get request details using sync_to_async
            status = await sync_to_async(getattr)(time_off_request, 'status')
            start_date = await sync_to_async(getattr)(time_off_request, 'start_date')
            end_date = await sync_to_async(getattr)(time_off_request, 'end_date')
            hours = await sync_to_async(getattr)(time_off_request, 'hours_requested')
            review_notes = await sync_to_async(getattr)(time_off_request, 'review_notes')
            
            subject = f'EA Promos Time Clock System - Time Off Request {status.title()}'
            message = f"""
                <h2>Time Off Request Update</h2>
                <p>Hello,</p>
                <p>Your time off request has been <strong>{status}</strong>.</p>
                <br>
                <p><strong>Request Details:</strong></p>
                <p><strong>Start Date:</strong> {start_date}</p>
                <p><strong>End Date:</strong> {end_date}</p>
                <p><strong>Hours:</strong> {hours}</p>
                <br>
                <p><strong>Review Notes:</strong></p>
                <p>{review_notes or 'No notes provided'}</p>
                <br>
                <p>Best regards,</p>
                <p>EA Promos Management Team</p>
            """
            
            try:
                result = await send_shared_mail_async(email, subject, message)
                if result:
                    logger.info(f"Successfully sent review notification to {email}")
                else:
                    logger.error(f"Failed to send review notification to {email}")
                return result
            except Exception as e:
                logger.error(f"Error sending review notification email: {str(e)}")
                return False
                
        except Exception as e:
            logger.error(f"Error preparing review notification: {str(e)}")
            return False

    async def _add_to_calendar_async(self, time_off_request):
        try:
            # Get access token
            access_token = await self._get_access_token_async()
            if not access_token:
                logger.error("Failed to get access token for calendar")
                return False
            
            # Calendar configuration
            calendar_email = 'deanna@eapromos.com'
            
            # Get employee details using sync_to_async
            employee = await sync_to_async(getattr)(time_off_request, 'employee')
            employee_first_name = await sync_to_async(getattr)(employee, 'first_name')
            employee_last_name = await sync_to_async(getattr)(employee, 'last_name')
            reviewed_by = await sync_to_async(getattr)(time_off_request, 'reviewed_by')
            reviewed_by_full_name = await sync_to_async(reviewed_by.get_full_name)()
            
            # Create event using Microsoft Graph API (using beta endpoint)
            url = f"https://graph.microsoft.com/beta/users/{calendar_email}/calendar/events"
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json',
                'Prefer': 'outlook.timezone="America/New_York"'
            }
            
            # Create detailed event body
            event_body = (
                f"Employee: {employee_first_name} {employee_last_name}\n"
                f"Type: {time_off_request.get_request_type_display()}\n"
                f"Hours Requested: {time_off_request.hours_requested}\n\n"
                f"Employee Notes:\n{time_off_request.reason}\n\n"
                f"Approved by: {reviewed_by_full_name}\n"
                f"Approval Notes:\n{time_off_request.review_notes if time_off_request.review_notes else 'No notes provided'}"
            )
            
            # Prepare the event data
            if time_off_request.is_partial_day:
                start_time = timezone.make_aware(
                    timezone.datetime.combine(time_off_request.start_date, time_off_request.start_time)
                )
                end_time = timezone.make_aware(
                    timezone.datetime.combine(time_off_request.end_date, time_off_request.end_time)
                )
                event_data = {
                    'subject': f"Time Off - {employee_first_name} {employee_last_name} ({time_off_request.get_request_type_display()})",
                    'body': {
                        'contentType': 'text',
                        'content': event_body
                    },
                    'start': {
                        'dateTime': start_time.strftime('%Y-%m-%dT%H:%M:%S'),
                        'timeZone': 'America/New_York'
                    },
                    'end': {
                        'dateTime': end_time.strftime('%Y-%m-%dT%H:%M:%S'),
                        'timeZone': 'America/New_York'
                    },
                    'showAs': 'free'
                }
            else:
                event_data = {
                    'subject': f"Time Off - {employee_first_name} {employee_last_name} ({time_off_request.get_request_type_display()})",
                    'body': {
                        'contentType': 'text',
                        'content': event_body
                    },
                    'start': {
                        'dateTime': time_off_request.start_date.strftime('%Y-%m-%d'),
                        'timeZone': 'America/New_York'
                    },
                    'end': {
                        'dateTime': (time_off_request.end_date + timedelta(days=1)).strftime('%Y-%m-%d'),
                        'timeZone': 'America/New_York'
                    },
                    'isAllDay': True,
                    'showAs': 'free'
                }
            
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(url, headers=headers, json=event_data) as response:
                    if response.status in [200, 201]:
                        event_data = await response.json()
                        # Use sync_to_async for model updates
                        time_off_request.calendar_event_id = event_data['id']
                        save_request = sync_to_async(time_off_request.save)
                        await save_request()
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Calendar API error: {response.status} - {error_text}")
                        return False

        except Exception as e:
            logger.error(f"Error adding event to calendar: {str(e)}")
            return False

    async def _get_access_token_async(self):
        """Get access token using client credentials flow"""
        try:
            token_url = f"https://login.microsoftonline.com/{settings.AZURE_AD_TENANT_ID}/oauth2/v2.0/token"
            
            data = {
                'grant_type': 'client_credentials',
                'client_id': settings.O365_CLIENT_ID,
                'client_secret': settings.O365_CLIENT_SECRET,
                'scope': 'https://graph.microsoft.com/.default'
            }
            
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.post(token_url, data=data) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        return token_data.get('access_token')
                    else:
                        error_text = await response.text()
                        logger.error(f"Token API error: {response.status} - {error_text}")
                        return None

        except Exception as e:
            logger.error(f"Error getting access token: {str(e)}")
            return None

    async def _process_time_entries(self, time_off_request):
        try:
            # Define workday times (8am to 5pm)
            workday_start_time = time(8, 0)
            workday_end_time = time(17, 0)

            # Calculate total hours for validation
            total_hours = Decimal('0.00')
            current_date = time_off_request.start_date
            while current_date <= time_off_request.end_date:
                if current_date.weekday() in range(0, 4):  # Monday to Thursday
                    total_hours += Decimal('9.00')
                elif current_date.weekday() == 4:  # Friday
                    total_hours += Decimal('4.00')
                current_date += timedelta(days=1)

            # Get employee hours using sync_to_async
            employee = await sync_to_async(getattr)(time_off_request, 'employee')

            # Add time entries for each day
            current_date = time_off_request.start_date
            while current_date <= time_off_request.end_date:
                if current_date.weekday() in range(0, 5):  # Monday to Friday
                    if time_off_request.is_partial_day:
                        clock_in_time = timezone.make_aware(
                            timezone.datetime.combine(current_date, time_off_request.start_time)
                        )
                        clock_out_time = timezone.make_aware(
                            timezone.datetime.combine(current_date, time_off_request.end_time)
                        )
                    else:
                        # For Fridays, set different hours (8am to 12pm)
                        if current_date.weekday() == 4:  # Friday
                            workday_end_time = time(12, 0)  # End at noon on Fridays
                        else:
                            workday_end_time = time(17, 0)  # End at 5pm Mon-Thu
                            
                        clock_in_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_start_time))
                        clock_out_time = timezone.make_aware(timezone.datetime.combine(current_date, workday_end_time))

                    # Create the time entry using sync_to_async
                    create_time_entry = sync_to_async(TimeEntry.objects.create)
                    time_entry = await create_time_entry(
                        employee=employee,
                        clock_in_time=clock_in_time,
                        clock_out_time=clock_out_time,
                        full_day=not time_off_request.is_partial_day,
                        entry_type=time_off_request.request_type,
                        is_vacation=time_off_request.request_type == 'vacation',
                        is_sick=time_off_request.request_type == 'sick',
                        skip_hours_deduction=True  # Skip deducting hours since they're already handled by TimeOffRequest
                    )

                    # Create the note using sync_to_async
                    note_text = 'Vacation Day' if time_off_request.request_type == 'vacation' else 'Sick Day'
                    create_note = sync_to_async(Note.objects.create)
                    await create_note(
                        time_entry=time_entry,
                        created_by=self.request.user,
                        note_text=note_text
                    )

                current_date += timedelta(days=1)

        except Exception as e:
            logger.error(f"Error in _process_time_entries: {str(e)}")
            raise
