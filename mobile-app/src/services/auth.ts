import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { encryptCredentials } from '../utils/encryption';
import { APIError, handleAPIError } from '../utils/apiErrors';

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
        // Clear auth tokens
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');
        
        // Clear any cached data
        sessionStorage.clear();
        localStorage.clear(); // Also clear localStorage for complete cleanup
        
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

export const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
        // Clear any existing data before login
        clearAllUserData();
        
        // Basic input validation
        if (!username || !password) {
            throw new APIError('Username and password are required', 400);
        }
        
        // Encrypt credentials before sending
        const encryptedData = await encryptCredentials(username, password);
        
        const response = await axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, encryptedData);
        
        // Validate response data
        if (!response.data?.access || !response.data?.refresh) {
            throw new APIError('Invalid response from server', 401);
        }

        const { access, refresh, ...userData } = response.data;

        // Validate tokens before storing
        if (!isTokenValid(access)) {
            throw new APIError('Invalid access token received', 401);
        }

        // Store tokens securely
        sessionStorage.setItem('token', access);
        sessionStorage.setItem('refresh_token', refresh);

        // Store user data
        const userDataToStore: UserData = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            is_staff: userData.is_staff,
            is_admin: userData.is_staff,
            force_password_change: userData.force_password_change,
            employee: !userData.is_staff
        };
        sessionStorage.setItem('user', JSON.stringify(userDataToStore));

        // Update axios instance authorization header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        // Set up automatic token refresh
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
                // Force logout if token refresh fails
                await logout();
            }
        }, refreshTime);

        return response.data;
    } catch (error) {
        clearAllUserData();
        throw handleAPIError(error);
    }
};

export const logout = async (): Promise<void> => {
    try {
        const refreshToken = sessionStorage.getItem('refresh_token');
        
        if (refreshToken) {
            await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, { refresh_token: refreshToken });
        }
    } catch (error) {
        console.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
        clearAllUserData();
    }
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

        sessionStorage.setItem('token', response.data.access);
        return response.data.access;
    } catch (error) {
        clearAllUserData();
        return handleAPIError(error);
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
