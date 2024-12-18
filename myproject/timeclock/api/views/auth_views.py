from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import hashlib
from timeclock.models import PasswordResetToken

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    try:
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the user and associated employee
        user = request.user
        employee = user.employee

        # Clear biometric credentials
        user.biometric_credentials.all().delete()

        # Validate and set the new password
        user.set_password(new_password)
        
        # Clear the force_password_change flag
        employee.force_password_change = False
        
        # Save both objects
        user.save()
        employee.save()

        # Generate new tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return Response({
            'detail': 'Password changed successfully',
            'access': str(access_token),
            'refresh': str(refresh),
            'username': user.username,
            'email': user.email,
            'id': user.id,
            'is_staff': user.is_staff,
            'force_password_change': False
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

def get_user_from_reset_token(token):
    try:
        # Get token from database
        reset_token = PasswordResetToken.objects.get(token=hashlib.sha256(token.encode()).hexdigest())
        
        # Check if token is expired
        if reset_token.is_expired():
            reset_token.delete()
            return None
        
        return reset_token.user
    except PasswordResetToken.DoesNotExist:
        return None

@api_view(['POST'])
def reset_password(request, token):
    try:
        # Validate token and get user
        user = get_user_from_reset_token(token)
        if not user:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Clear biometric credentials
        user.biometric_credentials.all().delete()

        # Set the new password
        user.set_password(new_password)
        user.save()

        # If user has an employee profile, update force_password_change
        try:
            if hasattr(user, 'employee'):
                user.employee.force_password_change = False
                user.employee.save()
        except:
            pass  # Not all users have employee profiles

        # Generate new tokens for automatic login
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return Response({
            'detail': 'Password reset successfully',
            'access': str(access_token),
            'refresh': str(refresh),
            'username': user.username,
            'email': user.email,
            'id': user.id,
            'is_staff': user.is_staff,
            'force_password_change': False
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
