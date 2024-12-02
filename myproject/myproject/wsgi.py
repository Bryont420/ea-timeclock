"""
WSGI config for myproject project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# Rotate JWT key on server startup
try:
    call_command('rotate_jwt_key')
except Exception as e:
    print(f"Warning: Could not rotate JWT key on startup: {str(e)}")

application = get_wsgi_application()
