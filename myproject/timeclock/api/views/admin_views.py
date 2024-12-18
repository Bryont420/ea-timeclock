from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..serializers import AdminEmployeeSerializer
from ...models import Employee

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)

class AdminEmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = AdminEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        return Employee.objects.all().order_by('last_name', 'first_name')

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        try:
            clocked_in = self.request.data.get('clocked_in')
            if clocked_in is not None:
                serializer.instance.clocked_in = clocked_in
            serializer.save()
        except Exception as e:
            raise serializers.ValidationError({'detail': str(e)})

    @action(detail=True, methods=['get', 'patch'])
    def status(self, request, pk=None):
        employee = self.get_object()
        
        if request.method == 'PATCH':
            clocked_in = request.data.get('clocked_in')
            if clocked_in is not None:
                employee.clocked_in = clocked_in
                employee.save()
            
        return Response({
            'clocked_in': employee.clocked_in
        })

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        if employee.user:
            # Clear biometric credentials
            employee.user.biometric_credentials.all().delete()
            
            # Reset password and set force_password_change flag
            employee.user.set_password('changeme')
            employee.user.save()
            employee.force_password_change = True
            employee.save()
            return Response({'status': 'password reset'})
        return Response({'error': 'User not found'}, status=404)
