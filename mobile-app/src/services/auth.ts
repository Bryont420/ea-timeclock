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

export interface LoginResponse {
    access: string;
    refresh: string;
    username: string;
    is_staff: boolean;
    force_password_change: boolean;
    id: number;
    email: string;
}

export interface UserData {
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    is_admin: boolean;
    force_password_change: boolean;
    employee?: boolean;  // Optional employee flag for admin users
}

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
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
};

// Token validation helper
const isTokenValid = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        return Date.now() < expirationTime;
    } catch {
        return false;
    }
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

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

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

        // Store tokens
        sessionStorage.setItem('token', access);
        sessionStorage.setItem('refresh_token', refresh);

        // Store user data
        const userDataToStore = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            is_staff: userData.is_staff,
            is_admin: userData.is_staff,
            force_password_change: userData.force_password_change,
            employee: !userData.is_staff
        };
        sessionStorage.setItem('user', JSON.stringify(userDataToStore));

        // Update axios
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        // Set up token refresh
        const payload = JSON.parse(atob(access.split('.')[1]));
        const tokenExp = payload.exp * 1000;
        const refreshTime = tokenExp - Date.now() - (5 * 60 * 1000);

        if (window.tokenRefreshTimer) {
            clearTimeout(window.tokenRefreshTimer);
        }

        window.tokenRefreshTimer = setTimeout(async () => {
            try {
                await refreshAuthToken();
            } catch (error) {
                await logout();
            }
        }, refreshTime);

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

export const logout = (): Promise<void> => {
    return new Promise<void>(async (resolve) => {
        try {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                await axiosInstance.post(
                    API_ENDPOINTS.AUTH.LOGOUT,
                    { refresh_token: refreshToken }
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

export const getToken = (): string | null => {
    return sessionStorage.getItem('token');
};

export const getRefreshToken = (): string | null => {
    return sessionStorage.getItem('refresh_token');
};

export const getUserData = (): UserData | null => {
    const userData = sessionStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = (): boolean => {
    const token = getToken();
    const userData = getUserData();
    return !!(token && userData);
};

export const getAuthHeader = (): { Authorization: string } | undefined => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
};
