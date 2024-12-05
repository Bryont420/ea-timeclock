/**
 * @fileoverview Login form component that provides a user interface for
 * authentication. Features username and password inputs with proper validation,
 * error handling, and loading states.
 */

import React, { memo } from 'react';
import {
    TextField,
    Button,
    Typography,
    Box,
} from '@mui/material';

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
    /** Callback function to handle username changes */
    onUsernameChange: (value: string) => void;
    /** Callback function to handle password changes */
    onPasswordChange: (value: string) => void;
    /** Callback function to handle form submission */
    onSubmit: (e: React.FormEvent) => void;
}

/**
 * LoginForm component that provides a form for user authentication.
 * Features:
 * - Username and password input fields
 * - Error message display
 * - Loading state handling
 * - Form submission handling
 * - Proper autocomplete attributes
 * - Responsive layout with consistent spacing
 * 
 * @param props - Component props
 * @param props.username - Current username value
 * @param props.password - Current password value
 * @param props.error - Error message
 * @param props.loading - Loading state
 * @param props.onUsernameChange - Username change handler
 * @param props.onPasswordChange - Password change handler
 * @param props.onSubmit - Form submission handler
 * @returns The login form component
 */
export const LoginForm: React.FC<LoginFormProps> = memo(({
    username,
    password,
    error,
    loading,
    onUsernameChange,
    onPasswordChange,
    onSubmit,
}) => {
    return (
        <form onSubmit={onSubmit}>
            <Typography 
                variant="h5" 
                component="h1" 
                gutterBottom 
                textAlign="center"
                className="login-header"
            >
                Time Clock
            </Typography>
            <TextField
                fullWidth
                margin="normal"
                label="Username"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                error={!!error}
                disabled={loading}
                autoComplete="username"
            />
            <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                error={!!error}
                disabled={loading}
                autoComplete="current-password"
            />
            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                    {error}
                </Typography>
            )}
            <Box sx={{ mt: 3 }}>
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </Button>
            </Box>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                    component="a"
                    href="/password-reset-request"
                    variant="text"
                    size="small"
                >
                    Forgot Password?
                </Button>
            </Box>
        </form>
    );
});
