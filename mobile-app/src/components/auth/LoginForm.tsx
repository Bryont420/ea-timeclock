/**
 * @fileoverview Login form component that provides a user interface for
 * authentication. Features username and password inputs with proper validation,
 * error handling, and loading states. Also supports biometric authentication.
 */

import React, { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
    Box, 
    TextField, 
    Button, 
    Typography, 
    Stack
} from '@mui/material';
import { FingerprintOutlined as FingerprintIcon } from '@mui/icons-material';

/**
 * Props interface for the LoginForm component.
 */
interface LoginFormProps {
    /** Current username value */
    username: string;
    /** Current password value */
    password: string;
    /** Error message to display, if any */
    error: string;
    /** Whether the form is in a loading state */
    loading: boolean;
    /** Whether biometric authentication is available */
    isBiometricAvailable: boolean;
    /** Callback function to handle username changes */
    onUsernameChange: (value: string) => void;
    /** Callback function to handle password changes */
    onPasswordChange: (value: string) => void;
    /** Callback function to handle form submission */
    onSubmit: (e: React.FormEvent & { isBiometric?: boolean; biometricCredential?: any }) => Promise<any>;
    /** Callback function to handle biometric login */
    onBiometricLogin: () => Promise<void>;
}

/**
 * LoginForm component that provides a form for user authentication.
 * Features:
 * - Username and password input fields
 * - Error message display
 * - Loading state handling
 * - Form submission handling
 * - Biometric authentication support
 * - Proper autocomplete attributes
 * - Responsive layout with consistent spacing
 * 
 * @param props - Component props
 * @param props.username - Current username value
 * @param props.password - Current password value
 * @param props.error - Error message
 * @param props.loading - Loading state
 * @param props.isBiometricAvailable - Whether biometric authentication is available
 * @param props.onUsernameChange - Username change handler
 * @param props.onPasswordChange - Password change handler
 * @param props.onSubmit - Form submission handler
 * @param props.onBiometricLogin - Biometric login handler
 * @returns The login form component
 */
export const LoginForm: React.FC<LoginFormProps> = ({
    username,
    password,
    error,
    loading,
    isBiometricAvailable,
    onUsernameChange,
    onPasswordChange,
    onSubmit,
    onBiometricLogin
}) => {
    const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
        onUsernameChange(e.target.value);
    };

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        onPasswordChange(e.target.value);
    };

    return (
        <Box component="form" onSubmit={onSubmit} sx={{ width: '100%', maxWidth: 400, mx: 'auto', p: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom align="center">
                Time Clock
            </Typography>
            
            <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={handleUsernameChange}
                disabled={loading}
            />
            
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
            />

            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}

            <Stack spacing={2} sx={{ mt: 3 }}>
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                {isBiometricAvailable && (
                    <Button
                        onClick={onBiometricLogin}
                        disabled={loading}
                        variant="outlined"
                        startIcon={<FingerprintIcon />}
                        fullWidth
                    >
                        Sign in with Biometrics
                    </Button>
                )}
            </Stack>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                    component={Link}
                    to="/password-reset-request"
                    variant="text"
                    size="small"
                    color="primary"
                >
                    Forgot Password?
                </Button>
            </Box>
        </Box>
    );
};
