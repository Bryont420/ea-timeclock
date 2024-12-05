from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from timeclock.views.email_helpers import send_shared_mail_async
import json
import asyncio
from django.utils import timezone
from datetime import timedelta
from timeclock.models import PasswordResetToken
import hashlib

# Remove in-memory token storage
# reset_tokens = {}

@csrf_exempt
def request_password_reset(request):
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
    subject = 'Password Reset Request'
    body = f"Click the link to reset your password: {reset_link}"
    asyncio.run(send_shared_mail_async(email, subject, body))

    return JsonResponse({'message': 'Password reset link sent.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
def reset_password(request, token):
    new_password = request.data.get('new_password')

    try:
        reset_token = PasswordResetToken.objects.get(token=hashlib.sha256(token.encode()).hexdigest())
    except PasswordResetToken.DoesNotExist:
        return JsonResponse({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    if reset_token.is_expired():
        reset_token.delete()
        return JsonResponse({'error': 'Token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    user = reset_token.user
    # Validate password
    if not validate_password(new_password):
        return JsonResponse({'error': 'Password does not meet requirements.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    reset_token.delete()

    return JsonResponse({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)

def validate_password(password):
    # Check password requirements
    if (len(password) < 8 or
        not any(char.isdigit() for char in password) or
        not any(char.isupper() for char in password) or
        not any(char.islower() for char in password) or
        not any(char in '!@#$%^&*()_+-=[]{}|;:,.<>?' for char in password)):
        return False
    return True
