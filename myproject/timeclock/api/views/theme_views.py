from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from timeclock.models import AdminProfile, Employee
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_theme_preference(request):
    try:
        if request.user.is_staff:
            profile = AdminProfile.objects.get(user=request.user)
        else:
            profile = Employee.objects.get(user=request.user)
        
        theme_id = profile.theme_id or 'light'
        return Response({'themeId': theme_id}, status=status.HTTP_200_OK)
    except ObjectDoesNotExist:
        return Response({'themeId': 'light'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_theme_preference(request):
    theme_id = request.data.get('themeId')
    
    if not theme_id:
        return Response({'error': 'themeId is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if request.user.is_staff:
            profile = AdminProfile.objects.get(user=request.user)
        else:
            profile = Employee.objects.get(user=request.user)
        
        profile.theme_id = theme_id
        profile.save(update_fields=['theme_id'])
        return Response({'themeId': theme_id}, status=status.HTTP_200_OK)
        
    except ObjectDoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
