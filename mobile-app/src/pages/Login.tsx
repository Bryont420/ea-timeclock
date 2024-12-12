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
        if (!response) return;

        // Navigate based on user type
        if (response.is_staff) {
            navigate('/admin');
        } else if (response.force_password_change) {
            navigate('/change-password');
        } else {
            navigate('/dashboard');
        }
    };

    const handleBiometricLogin = async () => {
        try {
            const response = await handleBiometricLoginLogic();
            if (!response) return;

            // Navigate based on user type (same logic as handleLogin)
            if (response.is_staff) {
                navigate('/admin');
            } else if (response.force_password_change) {
                navigate('/change-password');
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
