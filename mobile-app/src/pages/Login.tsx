/**
 * @fileoverview Login page component that provides the main authentication interface.
 * Handles both traditional username/password login and biometric authentication for
 * mobile devices. Integrates with useLoginLogic hook for core functionality.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginContainer } from '../components/auth/LoginContainer';
import { LoginForm } from '../components/auth/LoginForm';
import { useLoginLogic } from '../hooks/useLoginLogic';

/**
 * Login page component that handles user authentication.
 * Features:
 * - Traditional username/password login
 * - Biometric authentication for mobile devices
 * - Automatic navigation based on user type:
 *   - Admin users to admin dashboard
 *   - Users requiring password change to change page
 *   - Regular users to employee dashboard
 * - Integration with useLoginLogic hook for core functionality
 * - Error handling and loading states
 * 
 * @returns The rendered Login page
 */
export const Login: React.FC = () => {
    const navigate = useNavigate();

    const {
        username,
        password,
        error,
        loading,
        isBiometricAvailable,
        setUsername,
        setPassword,
        handleSubmit,
        handleBiometricLogin: handleBiometricLoginLogic
    } = useLoginLogic();

    /**
     * Handles form submission for traditional login.
     * Processes the login response and navigates based on user type.
     * 
     * @param e - Form event with optional biometric properties
     */
    const handleLogin = async (e: React.FormEvent & { isBiometric?: boolean; biometricCredential?: any }) => {
        e.preventDefault();
        const response = await handleSubmit(e);
        
        if (!response) {
            console.log('No response from handleSubmit');
            return;
        }

        // Navigate based on user type
        if (response.is_staff) {
            navigate('/admin');
        } else if (response.force_password_change) {
            navigate('/force-password-change');
        } else {
            navigate('/dashboard');
        }
    };

    /**
     * Handles biometric authentication login attempt.
     * Processes the biometric login response and navigates based on user type.
     */
    const handleBiometricLogin = async () => {
        try {
            const response = await handleBiometricLoginLogic();
            if (!response) return;

            // Navigate based on user type (same logic as handleLogin)
            if (response.is_staff) {
                navigate('/admin');
            } else if (response.force_password_change) {
                navigate('/force-password-change');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            // Error is already handled in useLoginLogic
        }
    };

    return (
        <LoginContainer>
            <LoginForm
                username={username}
                password={password}
                error={error}
                loading={loading}
                isBiometricAvailable={isBiometricAvailable}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onSubmit={handleLogin}
                onBiometricLogin={handleBiometricLogin}
            />
        </LoginContainer>
    );
};
