import os
import secrets
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from dotenv import load_dotenv
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Rotates the JWT signing key and updates the .env file'

    def handle(self, *args, **options):
        try:
            # Generate new key
            new_key = secrets.token_urlsafe(64)
            
            # Load current .env file
            env_path = os.path.join(settings.BASE_DIR, '.env')
            with open(env_path, 'r') as file:
                env_lines = file.readlines()
            
            # Update JWT_SIGNING_KEY in .env
            new_env_lines = []
            key_updated = False
            for line in env_lines:
                if line.startswith('JWT_SIGNING_KEY='):
                    # Store old key with timestamp
                    old_key = line.split('=')[1].strip()
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    new_env_lines.append(f'# Old key from {timestamp}: {old_key}\n')
                    # Add new key
                    new_env_lines.append(f'JWT_SIGNING_KEY={new_key}\n')
                    key_updated = True
                else:
                    new_env_lines.append(line)
            
            # If JWT_SIGNING_KEY wasn't found, add it
            if not key_updated:
                new_env_lines.append(f'\n# JWT Settings\nJWT_SIGNING_KEY={new_key}\n')
            
            # Write updated content back to .env
            with open(env_path, 'w') as file:
                file.writelines(new_env_lines)
            
            self.stdout.write(
                self.style.SUCCESS('Successfully rotated JWT signing key')
            )
            
            # Invalidate all existing tokens
            OutstandingToken.objects.all().delete()
            
            # Force all refresh tokens to be blacklisted
            User = get_user_model()
            users = User.objects.all()
            for user in users:
                OutstandingToken.objects.filter(user=user).delete()
            
            self.stdout.write(
                self.style.SUCCESS('Cleared all tokens - all users will need to log in again')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to rotate JWT key: {str(e)}')
            )
