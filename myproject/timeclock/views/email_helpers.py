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
        email_data = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "HTML",
                    "content": body
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
