from django.http import JsonResponse
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework import status
import json
import hashlib
from datetime import timedelta
import asyncio
from ...models import PasswordResetToken, PasswordResetAttempt
from ...views.email_helpers import send_shared_mail_async

# Remove in-memory token storage
# reset_tokens = {}

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Get the first IP in the chain (the original client IP)
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

@api_view(['POST'])
@csrf_exempt
def request_password_reset(request):
    # Check for rate limiting first
    ip_address = get_client_ip(request)
    attempt = PasswordResetAttempt.check_and_create_ban(ip_address)
    
    if attempt.is_banned:
        ban_duration = attempt.ban_end - timezone.now()
        if attempt.ban_level == 4:
            message = "This IP address has been permanently banned from password resets due to too many attempts. Please contact an administrator."
        else:
            hours = ban_duration.total_seconds() / 3600
            if hours >= 1:
                duration = f"{int(hours)} hour{'s' if hours > 1 else ''}"
            else:
                minutes = ban_duration.total_seconds() / 60
                duration = f"{int(minutes)} minute{'s' if minutes > 1 else ''}"
            message = f"Too many password reset attempts from this IP. Please try again in {duration}."
        
        return JsonResponse({
            'error': message,
            'ban_level': attempt.ban_level,
            'ban_end': attempt.ban_end.isoformat()
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        email = data.get('email')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=user_id, email=email)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found or email does not match.'}, status=status.HTTP_404_NOT_FOUND)

    # Generate a secure token
    plain_token = get_random_string(length=32)
    hashed_token = hashlib.sha256(plain_token.encode()).hexdigest()
    expires_at = timezone.now() + timedelta(hours=1)  # Token expires in 1 hour
    PasswordResetToken.objects.create(user=user, token=hashed_token, expires_at=expires_at)

    # Send password reset email
    reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{plain_token}"
    subject = 'EA Promos Time Clock System - Password Reset Request'
    body = f"""
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for the EA Promos Time Clock System.</p>
        <p>Please click the link below to reset your password:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>If you did not request this password reset, please ignore this email and contact your supervisor immediately!</p>
        <br>
        <p>Best regards,</p>
        <p>EA Promos Management Team</p>
    """
    asyncio.run(send_shared_mail_async(email, subject, body))

    return JsonResponse({'message': 'Password reset link sent.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
def reset_password(request, token):
    # Check for rate limiting first
    ip_address = get_client_ip(request)
    attempt = PasswordResetAttempt.check_and_create_ban(ip_address)
    
    if attempt.is_banned:
        ban_duration = attempt.ban_end - timezone.now()
        if attempt.ban_level == 4:
            message = "This IP address has been permanently banned from password resets due to too many attempts. Please contact an administrator."
        else:
            hours = ban_duration.total_seconds() / 3600
            if hours >= 1:
                duration = f"{int(hours)} hour{'s' if hours > 1 else ''}"
            else:
                minutes = ban_duration.total_seconds() / 60
                duration = f"{int(minutes)} minute{'s' if minutes > 1 else ''}"
            message = f"Too many password reset attempts from this IP. Please try again in {duration}."
        
        return JsonResponse({
            'error': message,
            'ban_level': attempt.ban_level,
            'ban_end': attempt.ban_end.isoformat()
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    new_password = request.data.get('new_password')

    if not new_password:
        return JsonResponse({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Find the token in the database
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        reset_token = PasswordResetToken.objects.get(token=hashed_token)
        
        # Check if token has expired
        if timezone.now() > reset_token.expires_at:
            reset_token.delete()
            return JsonResponse({'error': 'Token has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the user and update their password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Delete the used token
        reset_token.delete()
        
        # Return user info for auto-login
        return JsonResponse({
            'success': True,
            'username': user.username,
            'email': user.email,
            'id': user.id,
            'is_staff': user.is_staff,
            'message': 'Password reset successfully'
        }, status=status.HTTP_200_OK)
        
    except PasswordResetToken.DoesNotExist:
        return JsonResponse({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

def validate_password(password):
    # Check password requirements
    if (len(password) < 8 or
        not any(char.isdigit() for char in password) or
        not any(char.isupper() for char in password) or
        not any(char.islower() for char in password) or
        not any(char in '!@#$%^&*()_+-=[]{}|;:,.<>?' for char in password)):
        return False
    return True
