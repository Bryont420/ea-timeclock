/**
 * @fileoverview Password reset service that handles password reset requests
 * and password reset operations. Manages token-based password reset flow
 * and handles biometric credential cleanup.
 */

import { axiosInstance } from '../utils/axios';

/**
 * Interface for password reset response
 */
interface PasswordResetResponse {
    success: boolean;
    data?: {
        username: string;
        email: string;
        id: number;
        is_staff: boolean;
        access: string;
        refresh: string;
    };
    error?: string;
    message?: string;
}

/**
 * Requests a password reset for a user.
 * Sends an email with reset instructions to the user.
 * 
 * @param userId - User's ID
 * @param email - User's email address
 * @returns Promise that resolves to the API response
 * @throws Error if request fails
 */
export const requestPasswordReset = async (userId: string, email: string) => {
    try {
        const response = await axiosInstance.post(`/api/password-reset/request/`, {
            user_id: userId,
            email: email,
        });
        return response.data;
    } catch (error) {
        throw (error as any).response ? (error as any).response.data : new Error('Network error');
    }
};

/**
 * Resets a user's password using a reset token.
 * Features:
 * - Updates user's password
 * - Stores new authentication tokens
 * - Clears biometric credentials
 * - Updates user session data
 * 
 * @param token - Password reset token
 * @param newPassword - New password to set
 * @returns Promise that resolves to reset response
 */
export const resetPassword = async (token: string, newPassword: string): Promise<PasswordResetResponse> => {
    try {
        const response = await axiosInstance.post(`/api/password-reset/reset/${token}/`, {
            new_password: newPassword
        });

        if (response.data) {
            // Store the new tokens
            sessionStorage.setItem('access_token', response.data.access);
            sessionStorage.setItem('refresh_token', response.data.refresh);
            sessionStorage.setItem('user', JSON.stringify({
                username: response.data.username,
                email: response.data.email,
                id: response.data.id,
                is_staff: response.data.is_staff,
                force_password_change: false
            }));

            // Clear biometric credentials for this user since password changed
            const storedData = localStorage.getItem(`biometric_${response.data.username}`);
            if (storedData) {
                localStorage.removeItem(`biometric_${response.data.username}`);
                console.debug('Cleared biometric credentials after password reset');
            }

            return {
                success: true,
                data: response.data
            };
        }
        return {
            success: false,
            error: 'Invalid response from server'
        };
    } catch (error) {
        console.error('Error resetting password:', error);
        return {
            success: false,
            error: error && typeof error === 'object' && 'response' in error
                ? (error.response as any)?.data?.error
                : 'Failed to reset password'
        };
    }
};
