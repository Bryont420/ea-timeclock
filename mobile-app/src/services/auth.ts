/**
 * @fileoverview Authentication service that handles user authentication, token management,
 * and biometric authentication. Provides comprehensive login/logout functionality with
 * rate limiting and token refresh mechanisms.
 */

import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { APIError } from '../utils/apiErrors';
import { encryptCredentials } from '../utils/encryption';
import { isMobileDevice } from '../utils/deviceDetection';

// Extend Window interface to include our custom properties
declare global {
    interface Window {
        tokenRefreshTimer?: ReturnType<typeof setTimeout>;
    }
}

/**
 * Interface for login response data from the API
 */
export interface LoginResponse {
    access: string;
    refresh: string;
    username: string;
    is_staff: boolean;
    force_password_change: boolean;
    id: number;
    email: string;
}

/**
 * Interface for user data stored in session
 */
export interface UserData {
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    is_admin: boolean;
    force_password_change: boolean;
    employee?: boolean;  // Optional employee flag for admin users
}

/**
 * Clears all user-related data from storage.
 * Preserves biometric data on mobile devices.
 */
export const clearAllUserData = () => {
    try {
        // Save biometric data and lastUsername if on mobile
        const lastUsername = isMobileDevice() ? localStorage.getItem('lastUsername') : null;
        const biometricData = isMobileDevice() ? 
            Object.keys(localStorage)
                .filter(key => key.startsWith('biometric_'))
                .reduce((acc: Record<string, string>, key) => {
                    acc[key] = localStorage.getItem(key) || '';
                    return acc;
                }, {}) 
            : null;
        
        // Clear auth tokens
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');
        
        // Clear all storage
        sessionStorage.clear();
        localStorage.clear();
        
        // Restore saved data on mobile
        if (isMobileDevice()) {
            // Restore lastUsername
            if (lastUsername) {
                localStorage.setItem('lastUsername', lastUsername);
            }
            // Restore biometric data
            if (biometricData) {
                Object.entries(biometricData).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }
        }
        
        // Clear any sensitive data in memory
        if (axiosInstance.defaults.headers.common['Authorization']) {
            delete axiosInstance.defaults.headers.common['Authorization'];
        }
        
        // Clear any pending token refresh timers
        if (window.tokenRefreshTimer) {
            clearTimeout(window.tokenRefreshTimer);
            window.tokenRefreshTimer = undefined;
        }

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.active?.postMessage({ type: 'LOGOUT' });
            });
        }
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
};

/**
 * Validates a JWT token format and expiration.
 * @param token - JWT token to validate
 * @returns True if token is valid and not expired
 */
const isTokenValid = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() < expirationTime;
    } catch {
        return false;
    }
};

/**
 * Converts an ArrayBuffer to a Base64 string.
 * Used for biometric credential processing.
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 encoded string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
};

/**
 * Verifies biometric credentials for a user.
 * @param username - Username to verify biometrics for
 * @returns Object containing verification status and credential
 */
export const verifyBiometric = async (username: string): Promise<{ verified: boolean, credential: any }> => {
    try {
        // Get stored credential ID for this user
        const storedCredentialData = localStorage.getItem(`biometric_${username}`);
        if (!storedCredentialData) {
            throw new Error('No biometric credentials found');
        }
        const storedCredential = JSON.parse(storedCredentialData);
        if (!storedCredential.rawId) {
            throw new Error('Invalid stored credential - missing rawId');
        }

        // Create the challenge
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Convert challenge to base64 string
        const challengeBase64 = arrayBufferToBase64(challenge);

        // Create assertion options
        const assertionOptions = {
            challenge: challengeBase64,
            allowCredentials: [{
                id: storedCredential.rawId,
                type: 'public-key',
                transports: ['internal']
            }],
            timeout: 60000,
            userVerification: 'required' as UserVerificationRequirement,
            rpId: window.location.hostname
        };

        // Get the credential
        const assertion = await navigator.credentials.get({
            publicKey: {
                ...assertionOptions,
                challenge: challenge,
                allowCredentials: [{
                    id: Uint8Array.from(atob(storedCredential.rawId), c => c.charCodeAt(0)),
                    type: 'public-key',
                    transports: ['internal']
                }]
            }
        }) as PublicKeyCredential;

        // Get the response
        const response = assertion.response as AuthenticatorAssertionResponse;

        // Convert the response data to base64
        const clientDataJSON = arrayBufferToBase64(response.clientDataJSON);
        const authenticatorData = arrayBufferToBase64(response.authenticatorData);
        const signature = arrayBufferToBase64(response.signature);

        return {
            verified: true,
            credential: {
                clientData: clientDataJSON,
                authenticatorData: authenticatorData,
                signature: signature
            }
        };
    } catch (error) {
        console.error('Biometric verification error:', error);
        return {
            verified: false,
            credential: null
        };
    }
};

// Rate limiting configuration
/** Maximum number of login attempts before lockout */
const MAX_LOGIN_ATTEMPTS = 5;
/** Duration of lockout in milliseconds */
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
/** Map to track login attempts by username */
const loginAttempts = new Map<string, { count: number; timestamp: number }>();

/**
 * Authenticates a user with username/password or biometric credentials.
 * Features:
 * - Rate limiting with lockout
 * - Biometric authentication support
 * - Automatic token refresh setup
 * - Error handling with specific messages
 * 
 * @param username - User's username
 * @param password - User's password (optional if using biometrics)
 * @param isBiometric - Whether to use biometric authentication
 * @param biometricCredential - Biometric credential data
 * @returns Login response with tokens and user data
 * @throws APIError if authentication fails
 */
export const login = async (
    username: string, 
    password?: string, 
    isBiometric: boolean = false,
    biometricCredential?: any
): Promise<LoginResponse> => {
    // Check rate limiting
    const userAttempts = loginAttempts.get(username);
    const now = Date.now();
    
    if (userAttempts && userAttempts.count >= MAX_LOGIN_ATTEMPTS) {
        if (now - userAttempts.timestamp < LOCKOUT_DURATION) {
            throw new APIError('Too many login attempts. Please try again later.', 429);
        } else {
            loginAttempts.delete(username);
        }
    }

    try {
        // Clear any existing data before login attempt
        clearAllUserData();

        // Basic input validation
        if (!username) {
            throw new APIError('Username is required', 400);
        }

        let response;
        if (isBiometric) {
            // Get stored credential data
            const storedData = localStorage.getItem(`biometric_${username}`);
            if (!storedData) {
                throw new APIError('No stored biometric credentials found', 401);
            }

            const storedCredential = JSON.parse(storedData);
            if (!storedCredential.id) {
                throw new APIError('Invalid stored credential data', 401);
            }

            // Call biometric login endpoint
            response = await axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.BIOMETRIC_LOGIN, {
                username,
                credential_id: storedCredential.id,
                client_data: biometricCredential.clientData,
                authenticator_data: biometricCredential.authenticatorData,
                signature: biometricCredential.signature
            });
        } else {
            // Regular password login
            if (!password) {
                throw new APIError('Password is required for non-biometric login', 400);
            }

            const requestData = await encryptCredentials(username, password);
            response = await axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, requestData);
        }

        // Validate response data
        if (!response.data?.access || !response.data?.refresh) {
            throw new APIError('Invalid response from server', 401);
        }

        const { access, refresh, ...userData } = response.data;

        // Validate token
        if (!isTokenValid(access)) {
            throw new APIError('Invalid access token received', 401);
        }

        // Store auth tokens and user data
        if (!response.data.force_password_change) {
            sessionStorage.setItem('token', response.data.access);
            sessionStorage.setItem('refresh_token', response.data.refresh);
            sessionStorage.setItem('user', JSON.stringify(userData));
            
            // Set up token refresh timer
            const payload = JSON.parse(atob(access.split('.')[1]));
            const tokenExp = payload.exp * 1000;
            const refreshTime = tokenExp - Date.now() - (5 * 60 * 1000); // Refresh 5 minutes before expiry

            if (window.tokenRefreshTimer) {
                clearTimeout(window.tokenRefreshTimer);
            }

            window.tokenRefreshTimer = setTimeout(async () => {
                try {
                    await refreshAuthToken();
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    await logout();
                }
            }, refreshTime);

            // Update axios headers with new token
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        } else {
            // For force password change, only store minimal data needed
            sessionStorage.setItem('token', response.data.access);
            sessionStorage.setItem('user', JSON.stringify({
                username: response.data.username,
                force_password_change: true,
                is_staff: response.data.is_staff
            }));
        }

        return response.data;
    } catch (error) {
        // Update login attempts on failure
        const attempts = loginAttempts.get(username);
        if (attempts) {
            loginAttempts.set(username, { count: attempts.count + 1, timestamp: Date.now() });
        } else {
            loginAttempts.set(username, { count: 1, timestamp: Date.now() });
        }
        clearAllUserData();
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 401);
    }
};

/**
 * Logs out the current user.
 * Clears all tokens and user data.
 */
export const logout = (): Promise<void> => {
    return new Promise<void>(async (resolve) => {
        try {
            const refreshToken = getRefreshToken();
            const accessToken = getToken();
            if (refreshToken && accessToken) {
                await axiosInstance.post(
                    API_ENDPOINTS.AUTH.LOGOUT,
                    { refresh_token: refreshToken },
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
            // Even if the server request fails, we still want to clear local data
        } finally {
            clearAllUserData();
            resolve();
        }
    });
};

/**
 * Refreshes the authentication token using the refresh token.
 * @returns New access token
 * @throws APIError if refresh fails
 */
export const refreshAuthToken = async (): Promise<string> => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await axiosInstance.post<{ access: string }>(
            API_ENDPOINTS.AUTH.REFRESH,
            { refresh: refreshToken }
        );

        if (!response.data?.access) {
            throw new Error('Invalid response from refresh token endpoint');
        }

        const newAccessToken = response.data.access;

        // Validate the new token
        if (!isTokenValid(newAccessToken)) {
            throw new Error('Invalid access token received from refresh');
        }

        // Store the new token
        sessionStorage.setItem('token', newAccessToken);

        // Update axios authorization header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

        // Set up the next token refresh
        const payload = JSON.parse(atob(newAccessToken.split('.')[1]));
        const tokenExp = payload.exp * 1000;
        const refreshTime = tokenExp - Date.now() - (5 * 60 * 1000); // Refresh 5 minutes before expiry

        if (window.tokenRefreshTimer) {
            clearTimeout(window.tokenRefreshTimer);
        }

        window.tokenRefreshTimer = setTimeout(async () => {
            try {
                await refreshAuthToken();
            } catch (error) {
                console.error('Token refresh failed:', error);
                await logout();
            }
        }, refreshTime);

        return newAccessToken;
    } catch (error) {
        console.error('Error refreshing token:', error);
        await logout();
        throw error;
    }
};

/**
 * Gets the current access token from storage.
 * @returns Access token or null if not found
 */
export const getToken = (): string | null => {
    return sessionStorage.getItem('token');
};

/**
 * Gets the current refresh token from storage.
 * @returns Refresh token or null if not found
 */
export const getRefreshToken = (): string | null => {
    return sessionStorage.getItem('refresh_token');
};

/**
 * Gets the current user data from storage.
 * @returns User data or null if not found
 */
export const getUserData = (): UserData | null => {
    const userData = sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
};

/**
 * Checks if user is currently authenticated.
 * @returns True if user has valid token
 */
export const isAuthenticated = (): boolean => {
    const token = getToken();
    const userData = getUserData();
    return !!(token && userData);
};

/**
 * Gets the authorization header for API requests.
 * @returns Authorization header object or undefined if no token
 */
export const getAuthHeader = (): { Authorization: string } | undefined => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
};

/**
 * Changes the user's password.
 * Handles re-authentication with new credentials.
 * 
 * @param newPassword - New password to set
 * @returns Login response with new tokens
 * @throws APIError if password change fails
 */
export const changePassword = async (newPassword: string): Promise<LoginResponse> => {
    try {
        const token = getToken();
        if (!token) {
            throw new APIError('No authentication token found', 401);
        }

        const response = await axiosInstance.post<LoginResponse>(
            API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
            { new_password: newPassword },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // The backend should return new tokens after password change
        const { access, refresh, ...userData } = response.data;
        
        // Update tokens
        sessionStorage.setItem('token', access);
        sessionStorage.setItem('refresh_token', refresh);
        
        // Update user data
        const updatedUserData = {
            ...userData,
            force_password_change: false
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUserData));

        // Clear biometric credentials for this user since password changed
        const storedData = localStorage.getItem(`biometric_${userData.username}`);
        if (storedData) {
            localStorage.removeItem(`biometric_${userData.username}`);
            console.debug('Cleared biometric credentials after password change');
        }

        return response.data;
    } catch (error) {
        if (error instanceof Error) {
            throw new APIError(error.message, error instanceof APIError ? error.status : 400);
        }
        throw new APIError('Failed to change password', 400);
    }
};
