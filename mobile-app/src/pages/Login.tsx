import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginContainer } from '../components/auth/LoginContainer';
import { LoginForm } from '../components/auth/LoginForm';
import { useLoginLogic } from '../hooks/useLoginLogic';

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

    const handleLogin = async (e: React.FormEvent & { isBiometric?: boolean; biometricCredential?: any }) => {
        e.preventDefault();
        const response = await handleSubmit(e);
        
        if (!response) {
            console.log('No response from handleSubmit');
            return;
        }

        // Navigate based on user type
        if (response.is_staff) {
            console.log('User is staff, navigating to admin');
            navigate('/admin');
        } else if (response.force_password_change) {
            console.log('Force password change is true, navigating to force-password-change');
            navigate('/force-password-change');
        } else {
            console.log('Regular user, navigating to dashboard');
            navigate('/dashboard');
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const response = await handleBiometricLoginLogic();
            if (!response) return;

            // Navigate based on user type (same logic as handleLogin)
            if (response.is_staff) {
                console.log('Navigating to admin');
                navigate('/admin');
            } else if (response.force_password_change) {
                console.log('Navigating to force password change');
                navigate('/force-password-change');
            } else {
                console.log('Navigating to dashboard');
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
