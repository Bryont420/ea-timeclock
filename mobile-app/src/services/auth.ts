import { axiosInstance } from '../utils/axios';
import { API_ENDPOINTS } from '../config';
import { encryptCredentials } from '../utils/encryption';
import { APIError, handleAPIError } from '../utils/apiErrors';

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
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Clear any cached data
        sessionStorage.clear();
        
        // Remove Authorization header
        if (axiosInstance.defaults.headers.common['Authorization']) {
            delete axiosInstance.defaults.headers.common['Authorization'];
        }
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
};

export const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
        // Clear any existing data before login
        clearAllUserData();
        
        // Encrypt credentials before sending
        const encryptedData = await encryptCredentials(username, password);
        
        const response = await axiosInstance.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, encryptedData);
        
        // Validate response data
        if (!response.data?.access || !response.data?.refresh) {
            throw new APIError('Invalid response from server', 401);
        }

        const { access, refresh, ...userData } = response.data;

        // Store tokens
        localStorage.setItem('token', access);
        localStorage.setItem('refresh_token', refresh);

        // Store user data
        const userDataToStore: UserData = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            is_staff: userData.is_staff,
            is_admin: userData.is_staff, // Admin status is same as staff status
            force_password_change: userData.force_password_change,
            employee: !userData.is_staff // If not staff, assume they're an employee
        };
        localStorage.setItem('user', JSON.stringify(userDataToStore));

        // Update axios instance authorization header
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        return response.data;
    } catch (error) {
        // Clear any existing tokens on login failure
        clearAllUserData();
        
        // Convert error to APIError with appropriate message
        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('403')) {
                throw new APIError('Invalid username or password', 401);
            }
            throw new APIError(error.message, 500);
        }
        throw new APIError('An error occurred during login', 500);
    }
};

export const logout = async (): Promise<void> => {
    try {
        const refreshToken = localStorage.getItem('refresh_token');
        
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

        localStorage.setItem('token', response.data.access);
        return response.data.access;
    } catch (error) {
        clearAllUserData();
        return handleAPIError(error);
    }
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refresh_token');
};

export const getUserData = (): UserData | null => {
    const userData = localStorage.getItem('user');
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
