import { API_ENDPOINTS } from '../config';
import { axiosInstance } from './axios';

/**
 * Utility functions for handling biometric authentication using WebAuthn (Web Authentication API)
 * 
 * Security Model:
 * --------------
 * 1. Credentials:
 *    - Private key: Stored securely in device hardware (secure enclave/TPM)
 *    - Public key: Used for verification, safe to store
 *    - NO passwords or sensitive data are ever stored
 * 
 * 2. Storage:
 *    - We only store public credential data in localStorage
 *    - Stored data includes: credential ID, public key ID, type, and username
 *    - None of this data can be used to authenticate without:
 *      a) Physical access to the registered device
 *      b) The user's actual biometric (fingerprint/face)
 * 
 * 3. Authentication Flow:
 *    - Registration: Creates a public/private key pair in device hardware
 *    - Verification: Uses challenge-response with the secure hardware
 *    - All biometric operations happen in the device's secure hardware
 */

interface StoredCredential {
    // Public identifier for the credential - not sensitive
    id: string;
    // Public key credential ID - used to identify the key pair in secure hardware
    rawId: string;
    // Always "public-key" - indicates the credential type
    type: string;
    // Username to associate credential - not sensitive
    username: string;
    // Public key data
    publicKey: string;
    // Client data
    clientData: string;
    // Attestation object
    attestationObject: string;
}

// Check if the browser supports biometric authentication
export const isBiometricSupported = (): boolean => {
    return window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
};

// Check if the device has biometric capabilities
export const checkBiometricCapability = async (): Promise<boolean> => {
    if (!isBiometricSupported()) {
        return false;
    }

    try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
    } catch (error) {
        console.error('Error checking biometric capability:', error);
        return false;
    }
};

// Check if the device is mobile
export const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Convert string to Uint8Array
const str2ab = (str: string): Uint8Array => {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
};

// Convert ArrayBuffer to Base64 string
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
};

// Convert Base64 string to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Store credential in localStorage and send to backend
const storeCredential = async (credential: PublicKeyCredential, username: string) => {
    try {
        // Get the attestation response
        const response = credential.response as AuthenticatorAttestationResponse;
        
        // Convert the credential data to base64
        const rawIdBase64 = arrayBufferToBase64(credential.rawId);
        const publicKeyBase64 = arrayBufferToBase64(response.getPublicKey() as ArrayBuffer);
        const clientDataBase64 = arrayBufferToBase64(response.clientDataJSON);
        const attestationObjectBase64 = arrayBufferToBase64(response.attestationObject);

        const storedCredential: StoredCredential = {
            id: credential.id,
            rawId: rawIdBase64,
            type: credential.type,
            username,
            publicKey: publicKeyBase64,
            clientData: clientDataBase64,
            attestationObject: attestationObjectBase64
        };

        const key = `biometric_${username}`;
        const value = JSON.stringify(storedCredential);
        
        // First clear any existing credential
        localStorage.removeItem(key);
        // Then store the new one
        localStorage.setItem(key, value);
        
        // Verify the storage was successful
        const stored = localStorage.getItem(key);
        if (!stored) {
            throw new Error('Failed to store credential - storage verification failed');
        }

        // Verify we can parse the stored data
        const parsedStored = JSON.parse(stored);
        if (!parsedStored.id || !parsedStored.rawId || !parsedStored.publicKey) {
            throw new Error('Failed to store credential - stored data is incomplete');
        }

        // Send the credential to the backend
        try {
            const response = await axiosInstance.post(API_ENDPOINTS.AUTH.BIOMETRIC_REGISTER, {
                username: username,
                credential_id: credential.id,
                public_key: publicKeyBase64,
                attestation: attestationObjectBase64
            });

            if (!response.data) {
                throw new Error('Failed to register biometric with server');
            }
        } catch (error) {
            // If backend registration fails, remove from localStorage
            localStorage.removeItem(key);
            throw error;
        }
    } catch (error) {
        throw new Error(`Failed to store credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// Get stored credential from localStorage
const getStoredCredential = (username: string): StoredCredential | null => {
    try {
        const key = `biometric_${username}`;
        const stored = localStorage.getItem(key);
        
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as StoredCredential;
        
        // Validate the parsed credential
        if (!parsed.id || !parsed.rawId || !parsed.type || !parsed.username || !parsed.publicKey) {
            localStorage.removeItem(key); // Remove invalid credential
            return null;
        }

        return parsed;
    } catch (error) {
        // If there's an error parsing, remove the invalid data
        localStorage.removeItem(`biometric_${username}`);
        return null;
    }
};

// Register biometric credentials
export const registerBiometric = async (username: string): Promise<string> => {
    // Skip biometric registration on desktop
    if (!isMobileDevice()) {
        return '';
    }

    try {
        // First remove any existing registration
        removeBiometric(username);
        
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const rpId = window.location.hostname || 'localhost';
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
            challenge,
            rp: {
                name: 'Time Clock App',
                id: rpId
            },
            user: {
                id: str2ab(username),
                name: username,
                displayName: username
            },
            pubKeyCredParams: [
                {
                    type: 'public-key',
                    alg: -7 // ES256
                },
                {
                    type: 'public-key',
                    alg: -257 // RS256
                }
            ],
            timeout: 60000,
            attestation: 'direct',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                requireResidentKey: false
            }
        };

        // Create the credential
        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions
        }) as PublicKeyCredential;

        if (!credential || !credential.response) {
            throw new Error('Failed to create credential - no response received');
        }

        // Store the credential
        await storeCredential(credential, username);
        
        // Verify we can retrieve it
        const storedCredential = await getStoredCredential(username);
        if (!storedCredential) {
            throw new Error('Failed to verify credential after storage');
        }
        
        // Verify the stored credential has all required fields
        if (!storedCredential.publicKey || !storedCredential.clientData || !storedCredential.attestationObject) {
            throw new Error('Failed to store complete credential data');
        }
        
        return credential.id;
    } catch (error) {
        // Clean up any partial registration
        removeBiometric(username);
        throw new Error(`Biometric registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// Verify biometric credentials
export const verifyBiometric = async (username: string): Promise<{ verified: boolean, credential: any, needsReregistration?: boolean }> => {
    try {
        const storedCredential = getStoredCredential(username);
        if (!storedCredential) {
            console.error('No stored biometric credentials found for user:', username);
            return {
                verified: false,
                credential: null,
                needsReregistration: true
            };
        }

        // Verify we have all required data
        if (!storedCredential.publicKey || !storedCredential.clientData || !storedCredential.attestationObject) {
            console.error('Incomplete credential data stored');
            removeBiometric(username); // Only remove this specific user's credentials
            return {
                verified: false,
                credential: null,
                needsReregistration: true
            };
        }

        // Verify the credential exists in the backend
        try {
            const response = await axiosInstance.post('/api/auth/biometric-verify/', {
                username,
                credential_id: storedCredential.id
            });
            
            if (!response.data?.valid) {
                // If the credential doesn't exist in the backend, remove only this user's credentials
                removeBiometric(username);
                return {
                    verified: false,
                    credential: null,
                    needsReregistration: true
                };
            }
        } catch (error) {
            // If there's any error verifying with the backend, remove only this user's credentials
            removeBiometric(username);
            return {
                verified: false,
                credential: null,
                needsReregistration: true
            };
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const rpId = window.location.hostname || 'localhost';
        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
            challenge,
            allowCredentials: [{
                id: base64ToArrayBuffer(storedCredential.rawId),
                type: 'public-key',
            }],
            timeout: 30000,
            userVerification: 'required',
            rpId
        };

        // Get the assertion
        const assertion = await Promise.race([
            navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Biometric verification timed out')), 31000)
            )
        ]) as PublicKeyCredential;

        if (!assertion || !assertion.response) {
            return {
                verified: false,
                credential: null,
                needsReregistration: false // Don't need re-registration, just failed verification
            };
        }

        // Get the response data
        const response = assertion.response as AuthenticatorAssertionResponse;
        
        // Convert response data to base64
        const clientData = arrayBufferToBase64(response.clientDataJSON);
        const authenticatorData = arrayBufferToBase64(response.authenticatorData);
        const signature = arrayBufferToBase64(response.signature);

        // Verify we have all required data
        if (!clientData || !authenticatorData || !signature) {
            return {
                verified: false,
                credential: null,
                needsReregistration: false // Don't need re-registration, just failed verification
            };
        }

        return {
            verified: true,
            credential: {
                clientData,
                authenticatorData,
                signature,
                publicKey: storedCredential.publicKey
            },
            needsReregistration: false
        };
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                return {
                    verified: false,
                    credential: null,
                    needsReregistration: false // Don't need re-registration on timeout
                };
            }
        }
        return {
            verified: false,
            credential: null,
            needsReregistration: false
        };
    }
};

// Remove biometric credentials
export const removeBiometric = (username: string): void => {
    localStorage.removeItem(`biometric_${username}`);
};

// Check if user has registered biometric
export const hasBiometricRegistered = (username: string): boolean => {
    const credential = getStoredCredential(username);
    return credential !== null;
};
