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
from ...models import PasswordResetToken
from ...views.email_helpers import send_shared_mail_async

# Remove in-memory token storage
# reset_tokens = {}

@api_view(['POST'])
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
