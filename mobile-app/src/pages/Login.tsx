import React, { useEffect } from 'react';
import { LoginContainer } from '../components/auth/LoginContainer';
import { LoginForm } from '../components/auth/LoginForm';
import { useLoginLogic } from '../hooks/useLoginLogic';

export const Login: React.FC = () => {
    const {
        username,
        password,
        error,
        loading,
        setUsername,
        setPassword,
        handleSubmit,
        resetToDefault
    } = useLoginLogic();

    // Ensure default background is used when component mounts
    useEffect(() => {
        resetToDefault();
    }, [resetToDefault]);

    return (
        <LoginContainer>
            <LoginForm
                username={username}
                password={password}
                error={error}
                loading={loading}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onSubmit={handleSubmit}
            />
        </LoginContainer>
    );
};
