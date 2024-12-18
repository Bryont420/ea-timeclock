# email_helpers.py
from django.conf import settings
from msal import ConfidentialClientApplication
import aiohttp
import asyncio
import ssl
import certifi
from datetime import datetime
import os
import platform
import OpenSSL.SSL
import socket

# Initialize MSAL ConfidentialClientApplication
msal_app = ConfidentialClientApplication(
    settings.AZURE_AD_CLIENT_ID,
    authority=f"https://login.microsoftonline.com/{settings.AZURE_AD_TENANT_ID}",
    client_credential=settings.AZURE_AD_CLIENT_SECRET
)

def get_access_token():
    """Acquire token using MSAL with built-in caching."""
    result = msal_app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" in result:
        return result["access_token"]
    else:
        error_message = result.get('error_description', 'Unknown error')
        raise Exception(f"Could not obtain access token: {error_message}")

def create_ssl_context():
    """Create an SSL context with system certificates"""
    context = ssl.create_default_context(cafile=certifi.where())
    return context

async def send_shared_mail_async(to_email, subject, body):
    try:
        # Acquire access token using MSAL
        access_token = get_access_token()

        endpoint = f"https://graph.microsoft.com/v1.0/users/{settings.EMAIL_FROM_ADDRESS}/sendMail"
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        # Add signature to the body
        full_body = f"""
        <html>
        <body>
            {body}
            {get_email_signature()}
        </body>
        </html>
        """

        email_data = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": full_body
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": to_email
                        }
                    }
                ]
            },
            "saveToSentItems": "true"
        }

        ssl_context = create_ssl_context()
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(endpoint, headers=headers, json=email_data) as response:
                if response.status == 202:  # Microsoft Graph API returns 202 Accepted for successful email sends
                    print("Email sent successfully.")
                    return True
                else:
                    response_text = await response.text()
                    print(f"Unexpected response status: {response.status}, body: {response_text}")
                    return False
                
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

# Keep the sync version for backward compatibility
def send_shared_mail(to_email, subject, body):
    """Synchronous wrapper for backward compatibility"""
    try:
        result = asyncio.run(send_shared_mail_async(to_email, subject, body))
        return result
    except Exception as e:
        print(f"Failed to send email (sync): {str(e)}")
        return False

def get_email_signature():
    """Returns the HTML for the email signature with logo"""
    # Use the full URL to the React app's public images
    logo_url = f"https://ea-time-clock.duckdns.org:1832/images/email-logo.jpg"
    return f'''
        <div style="margin-top: 20px;">
            <img src="{logo_url}" alt="EA Promos Logo" style="max-width: 200px; height: auto;">
        </div>
    '''

def send_welcome_email(to_email, username, password, employee_name):
    """Send welcome email to new employees with their login credentials"""
    subject = "EA Promos Time Clock System - New Employee"
    body = f"""
        <h2>Welcome to the EA Promos Team, {employee_name}!</h2>
        <p>Your Time Clock account has been created with the following credentials:</p>
        <p><strong>Username:</strong> {username}</p>
        <p><strong>Temporary Password:</strong> {password}</p>
        <p>For security reasons, you will be required to change your password when you first log in.</p>
        <p>You can access the Time Clock System here: <a href="{settings.APP_URL}">{settings.APP_URL}</a></p>
        <p>If you have any questions or issues, please contact your supervisor.</p>
        <br>
        <p>Best regards,</p>
        <p>EA Promos Management Team</p>
    """
    return send_shared_mail(to_email, subject, body)

def send_password_reset_email(to_email, username, new_password, employee_name):
    """Send password reset notification email"""
    subject = "EA Promos Time Clock System - Password Reset"
    body = f"""
        <h2>Password Reset Notification</h2>
        <p>Hello {employee_name},</p>
        <p>Your password has been reset. Here are your new login credentials:</p>
        <p><strong>Username:</strong> {username}</p>
        <p><strong>Temporary Password:</strong> {new_password}</p>
        <p>For security reasons, you will be required to change your password when you next log in.</p>
        <p>You can access the Time Clock System here: <a href="{settings.APP_URL}">{settings.APP_URL}</a></p>
        <p>If you did not request this password reset, please contact your supervisor immediately.</p>
        <br>
        <p>Best regards,</p>
        <p>EA Promos Management Team</p>
    """
    return send_shared_mail(to_email, subject, body)
