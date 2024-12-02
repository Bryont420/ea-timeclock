from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
import csv
from ..serializers import AdminTimeEntrySerializer
from ...models import TimeEntry, Employee
from .admin_views import IsAdminUser
from rest_framework import serializers
from django.db.models import Q
from django.contrib.auth.models import User

class AdminTimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = AdminTimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        try:
            queryset = TimeEntry.objects.all().order_by('-clock_in_time')
            
            # Filter by employee if specified
            employee_id = self.request.query_params.get('employee_id', None)
            if employee_id:
                queryset = queryset.filter(employee__employee_id=employee_id)
            
            # Filter by date range if specified
            start_date = self.request.query_params.get('start_date', None)
            end_date = self.request.query_params.get('end_date', None)
            
            if start_date and end_date:
                try:
                    # Convert to server's timezone
                    start_datetime = timezone.make_aware(datetime.strptime(start_date, '%Y-%m-%d').replace(hour=0, minute=0, second=0))
                    end_datetime = timezone.make_aware(datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
                    
                    queryset = queryset.filter(
                        Q(clock_in_time__range=(start_datetime, end_datetime)) |
                        Q(clock_out_time__range=(start_datetime, end_datetime))
                    )
                    
                except ValueError:
                    return TimeEntry.objects.none()
            
            # Select related fields to avoid N+1 queries
            final_queryset = queryset.select_related(
                'employee',
                'employee__user'
            ).prefetch_related(
                'notes'
            )
            
            return final_queryset
            
        except Exception:
            return TimeEntry.objects.none()

    def perform_create(self, serializer):
        try:
            employee_id = self.request.data.get('employee_id')
            if not employee_id:
                raise serializers.ValidationError({'employee_id': 'Employee ID is required'})
                
            try:
                # Try to find the employee by employee_id
                employee = Employee.objects.get(employee_id=employee_id)
            except Employee.DoesNotExist:
                # If not found, try to find by ID (in case employee_id is actually the ID)
                try:
                    employee = Employee.objects.get(id=employee_id)
                except (Employee.DoesNotExist, ValueError):
                    raise serializers.ValidationError({'employee_id': 'Employee not found'})
                
            entry_type = self.request.data.get('entry_type', 'regular')
            
            # Validate entry_type
            if entry_type not in dict(TimeEntry.ENTRY_TYPE_CHOICES):
                raise serializers.ValidationError({'entry_type': 'Invalid entry type'})
            
            # Set boolean flags based on entry_type
            is_vacation = entry_type == 'vacation'
            is_sick = entry_type == 'sick'
            is_holiday = entry_type == 'holiday'
            
            # Create the time entry
            time_entry = serializer.save(
                employee=employee,
                entry_type=entry_type,
                is_vacation=is_vacation,
                is_sick=is_sick,
                is_holiday=is_holiday
            )
            
            return time_entry
            
        except serializers.ValidationError:
            raise
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            raise serializers.ValidationError({'detail': str(e)})

    def perform_update(self, serializer):
        try:
            entry_type = self.request.data.get('entry_type', serializer.instance.entry_type)
            
            # Validate entry_type
            if entry_type not in dict(TimeEntry.ENTRY_TYPE_CHOICES):
                raise serializers.ValidationError({'entry_type': 'Invalid entry type'})
            
            # Set boolean flags based on entry_type
            is_vacation = entry_type == 'vacation'
            is_sick = entry_type == 'sick'
            is_holiday = entry_type == 'holiday'
            
            serializer.save(
                entry_type=entry_type,
                is_vacation=is_vacation,
                is_sick=is_sick,
                is_holiday=is_holiday
            )
        except serializers.ValidationError:
            raise
        except Exception as e:
            print(f"Error in perform_update: {str(e)}")
            raise serializers.ValidationError({'detail': str(e)})

    @action(detail=False, methods=['get'])
    def report(self, request):
        try:
            # Get filtered queryset
            queryset = self.get_queryset()
            
            # Create the HttpResponse object with CSV header
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="time_entries_report.csv"'
            
            # Create CSV writer
            writer = csv.writer(response)
            
            # Write header row
            writer.writerow([
                'Employee ID',
                'Employee Name',
                'Clock In Time',
                'Clock Out Time',
                'Total Hours',
                'Entry Type',
                'Notes'
            ])
            
            # Write data rows
            for entry in queryset:
                try:
                    total_hours = 0
                    if entry.clock_out_time:
                        time_diff = entry.clock_out_time - entry.clock_in_time
                        total_hours = round(time_diff.total_seconds() / 3600, 2)
                    
                    writer.writerow([
                        entry.employee.employee_id,
                        f"{entry.employee.first_name} {entry.employee.last_name}",
                        entry.clock_in_time.strftime('%Y-%m-%d %H:%M:%S'),
                        entry.clock_out_time.strftime('%Y-%m-%d %H:%M:%S') if entry.clock_out_time else 'Not Clocked Out',
                        total_hours,
                        entry.get_entry_type_display(),
                        entry.notes.first().note_text if entry.notes.exists() else ''
                    ])
                except Exception as e:
                    print(f"Error processing entry {entry.id}: {str(e)}")
                    continue
            
            return response
        except Exception as e:
            print(f"Error generating report: {str(e)}")
            return Response({'detail': 'Error generating report'}, status=500)

    @action(detail=True, methods=['get', 'post', 'put', 'delete'])
    def admin_time_entries(self, request, pk=None):
        if request.method == 'GET':
            try:
                if pk:
                    time_entry = get_object_or_404(TimeEntry, id=pk)
                    serializer = AdminTimeEntrySerializer(time_entry, context={'request': request})
                    return Response(serializer.data)
                else:
                    time_entries = TimeEntry.objects.all().order_by('-clock_in_time')
                    serializer = AdminTimeEntrySerializer(time_entries, many=True, context={'request': request})
                    return Response(serializer.data)
            except Exception as e:
                return Response({'error': str(e)}, status=500)

        elif request.method == 'POST':
            try:
                serializer = AdminTimeEntrySerializer(data=request.data, context={'request': request})
                if serializer.is_valid():
                    time_entry = serializer.save()
                    return Response(AdminTimeEntrySerializer(time_entry, context={'request': request}).data, status=201)
                return Response(serializer.errors, status=400)
            except Exception as e:
                return Response({'error': str(e)}, status=500)

        elif request.method == 'PUT':
            try:
                time_entry = get_object_or_404(TimeEntry, id=pk)
                serializer = AdminTimeEntrySerializer(time_entry, data=request.data, partial=True, context={'request': request})
                if serializer.is_valid():
                    time_entry = serializer.save()
                    return Response(AdminTimeEntrySerializer(time_entry, context={'request': request}).data)
                return Response(serializer.errors, status=400)
            except Exception as e:
                return Response({'error': str(e)}, status=500)

        elif request.method == 'DELETE':
            try:
                time_entry = get_object_or_404(TimeEntry, id=pk)
                employee = time_entry.employee

                # Check if this is a "clocked in" entry from today
                current_time = timezone.localtime()
                start_of_day = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
                end_of_day = start_of_day + timedelta(days=1)

                # If this is today's entry and has no clock out time, update employee status
                if (time_entry.clock_in_time >= start_of_day and 
                    time_entry.clock_in_time < end_of_day and 
                    not time_entry.clock_out_time):
                    employee.clocked_in = False
                    employee.save()

                time_entry.delete()
                return Response(status=204)
            except Exception as e:
                return Response({'error': str(e)}, status=500)
