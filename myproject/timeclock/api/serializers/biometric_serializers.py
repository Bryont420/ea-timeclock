from rest_framework import serializers
from timeclock.models import BiometricCredential

class BiometricCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricCredential
        fields = ['credential_id', 'public_key', 'sign_count']
        read_only_fields = ['sign_count']

class BiometricLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    credential_id = serializers.CharField()
    client_data = serializers.CharField()
    authenticator_data = serializers.CharField()
    signature = serializers.CharField()

class BiometricRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField()
    credential_id = serializers.CharField()
    public_key = serializers.CharField()
    attestation = serializers.CharField(required=False)
