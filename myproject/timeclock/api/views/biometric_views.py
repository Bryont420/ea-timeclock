import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from timeclock.models import BiometricCredential
from timeclock.api.serializers.biometric_serializers import (
    BiometricCredentialSerializer,
    BiometricLoginSerializer,
    BiometricRegistrationSerializer
)
from timeclock.api.authentication import generate_tokens_for_user, RefreshToken
import base64
import cbor2
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.serialization import load_pem_public_key

logger = logging.getLogger(__name__)
User = get_user_model()

def verify_webauthn_assertion(public_key_pem, client_data_json, authenticator_data, signature):
    """
    Verify a WebAuthn assertion
    """
    try:
        # Log the received data for debugging
        logger.debug("Verifying WebAuthn assertion with:")
        logger.debug(f"Public key (first 50 chars): {public_key_pem[:50] if public_key_pem else 'None'}")
        logger.debug(f"Client data length: {len(client_data_json) if client_data_json else 'None'}")
        logger.debug(f"Authenticator data length: {len(authenticator_data) if authenticator_data else 'None'}")
        logger.debug(f"Signature length: {len(signature) if signature else 'None'}")

        # Ensure the public key is properly formatted
        try:
            # First try to decode it as base64 if it's not in PEM format
            if not public_key_pem.startswith('-----BEGIN PUBLIC KEY-----'):
                try:
                    decoded_key = base64.b64decode(public_key_pem)
                    # Try to load the decoded key directly first
                    try:
                        public_key = load_pem_public_key(decoded_key)
                        logger.debug("Successfully loaded decoded base64 key directly")
                    except Exception:
                        # If that fails, wrap it in PEM format
                        pem_key = f"-----BEGIN PUBLIC KEY-----\n{public_key_pem}\n-----END PUBLIC KEY-----"
                        public_key = load_pem_public_key(pem_key.encode())
                        logger.debug("Successfully loaded key after PEM wrapping")
                except Exception as e:
                    logger.error(f"Failed to decode base64 key: {str(e)}")
                    # If base64 decode fails, try wrapping the original string
                    pem_key = f"-----BEGIN PUBLIC KEY-----\n{public_key_pem}\n-----END PUBLIC KEY-----"
                    public_key = load_pem_public_key(pem_key.encode())
                    logger.debug("Successfully loaded key with PEM wrapping of original")
            else:
                # Key is already in PEM format
                public_key = load_pem_public_key(public_key_pem.encode())
                logger.debug("Successfully loaded key that was already in PEM format")
        except Exception as e:
            logger.error(f"All attempts to load public key failed: {str(e)}")
            raise ValueError(f"Unable to load public key: {str(e)}")

        logger.debug(f"Successfully loaded public key of type: {type(public_key)}")

        # Decode client data and authenticator data
        try:
            decoded_client_data = base64.b64decode(client_data_json)
            logger.debug(f"Client data decoded, length: {len(decoded_client_data)}")
        except Exception as e:
            logger.error(f"Failed to decode client data: {str(e)}")
            raise ValueError("Invalid client data format")

        try:
            decoded_auth_data = base64.b64decode(authenticator_data)
            logger.debug(f"Authenticator data decoded, length: {len(decoded_auth_data)}")
        except Exception as e:
            logger.error(f"Failed to decode authenticator data: {str(e)}")
            raise ValueError("Invalid authenticator data format")

        try:
            decoded_signature = base64.b64decode(signature)
            logger.debug(f"Signature decoded, length: {len(decoded_signature)}")
        except Exception as e:
            logger.error(f"Failed to decode signature: {str(e)}")
            raise ValueError("Invalid signature format")

        # Verify the signature
        if isinstance(public_key, ec.EllipticCurvePublicKey):
            # For ECDSA
            # The message is the concatenation of authenticatorData and the hash of clientDataJSON
            try:
                client_data_hash = hashes.Hash(hashes.SHA256())
                client_data_hash.update(decoded_client_data)
                client_data_digest = client_data_hash.finalize()
                
                message = decoded_auth_data + client_data_digest
                logger.debug(f"Verification message created, length: {len(message)}")

                public_key.verify(
                    decoded_signature,
                    message,
                    ec.ECDSA(hashes.SHA256())
                )
                logger.debug("ECDSA signature verification successful")
                return True
            except InvalidSignature as e:
                logger.error(f"ECDSA signature verification failed: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Error during ECDSA verification: {str(e)}")
                return False
        else:
            # For RSA
            try:
                client_data_hash = hashes.Hash(hashes.SHA256())
                client_data_hash.update(decoded_client_data)
                client_data_digest = client_data_hash.finalize()
                
                message = decoded_auth_data + client_data_digest
                logger.debug(f"Verification message created, length: {len(message)}")

                public_key.verify(
                    decoded_signature,
                    message,
                    padding.PKCS1v15(),
                    hashes.SHA256()
                )
                logger.debug("RSA signature verification successful")
                return True
            except InvalidSignature as e:
                logger.error(f"RSA signature verification failed: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Error during RSA verification: {str(e)}")
                return False
    except Exception as e:
        logger.error(f"Error verifying WebAuthn assertion: {str(e)}")
        raise

class BiometricLoginView(APIView):
    def post(self, request):
        logger.info('Received biometric login request')
        
        # Log request data (without sensitive info)
        logger.info('Request data: %s', {
            'has_username': bool(request.data.get('username')),
            'has_credential_id': bool(request.data.get('credential_id')),
            'has_client_data': bool(request.data.get('client_data')),
            'has_authenticator_data': bool(request.data.get('authenticator_data')),
            'has_signature': bool(request.data.get('signature'))
        })

        serializer = BiometricLoginSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error('Biometric login serializer errors: %s', serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.info('Looking up user: %s', serializer.validated_data['username'])
            user = User.objects.get(username=serializer.validated_data['username'])
            
            logger.info('Looking up credential for user')
            credential = BiometricCredential.objects.get(
                user=user,
                credential_id=serializer.validated_data['credential_id']
            )

            # Get WebAuthn data
            client_data = serializer.validated_data['client_data']
            authenticator_data = serializer.validated_data['authenticator_data']
            signature = serializer.validated_data['signature']

            if not all([client_data, authenticator_data, signature]):
                logger.error('Missing required biometric data')
                return Response(
                    {'detail': 'Invalid biometric data'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify WebAuthn assertion
            is_valid = verify_webauthn_assertion(
                credential.public_key,
                client_data,
                authenticator_data,
                signature
            )

            if not is_valid:
                logger.error('WebAuthn verification failed')
                return Response(
                    {'detail': 'Invalid biometric signature'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Update sign count (optional but recommended)
            credential.sign_count += 1
            credential.save()

            # Generate response data (matching normal login)
            force_password_change = False
            if hasattr(user, 'employee'):
                force_password_change = user.employee.force_password_change

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            logger.info('Biometric login successful')
            return Response({
                'access': access_token,
                'refresh': str(refresh),
                'username': user.username,
                'email': user.email,
                'id': user.id,
                'is_staff': user.is_staff,
                'force_password_change': force_password_change
            })

        except User.DoesNotExist:
            logger.error('User not found: %s', serializer.validated_data.get('username'))
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except BiometricCredential.DoesNotExist:
            logger.error('Biometric credential not found for user: %s', serializer.validated_data.get('username'))
            return Response(
                {'detail': 'No biometric credentials found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception('Unexpected error during biometric login')
            return Response(
                {'detail': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class BiometricVerifyView(APIView):
    """
    Endpoint to verify if a biometric credential exists in the backend.
    This is used to check if stored credentials on the device are still valid.
    """
    permission_classes = []

    def post(self, request):
        try:
            username = request.data.get('username')
            credential_id = request.data.get('credential_id')

            if not username or not credential_id:
                return Response(
                    {'detail': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the user
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return Response(
                    {'valid': False},
                    status=status.HTTP_200_OK
                )

            # Check if the credential exists
            credential_exists = BiometricCredential.objects.filter(
                user=user,
                credential_id=credential_id
            ).exists()

            return Response({'valid': credential_exists})
        except Exception as e:
            logger.exception('Error verifying biometric credential')
            return Response(
                {'valid': False},
                status=status.HTTP_200_OK
            )

class BiometricRegistrationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BiometricRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get the public key from the request
            public_key = serializer.validated_data['public_key']

            # Decode the base64 public key
            try:
                decoded_key = base64.b64decode(public_key)
                # Try to load it to verify it's a valid public key
                try:
                    load_pem_public_key(decoded_key)
                    # If it loads successfully as is, use it directly
                    formatted_key = decoded_key
                except Exception:
                    # If it doesn't load, wrap it in PEM format
                    formatted_key = f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----".encode()
            except Exception as e:
                # If base64 decode fails, try wrapping the original
                formatted_key = f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----".encode()

            # Verify we can load the formatted key
            try:
                load_pem_public_key(formatted_key)
            except Exception as e:
                logger.error(f"Failed to validate formatted public key: {str(e)}")
                return Response(
                    {'detail': 'Invalid public key format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Store the formatted key as a string
            formatted_key_str = formatted_key.decode()

            # Create or update biometric credential
            credential, created = BiometricCredential.objects.update_or_create(
                user=request.user,
                credential_id=serializer.validated_data['credential_id'],
                defaults={
                    'public_key': formatted_key_str,
                    'sign_count': 0
                }
            )

            return Response(
                BiometricCredentialSerializer(credential).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception("Error in biometric registration")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
