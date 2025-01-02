/**
 * @fileoverview ForcePasswordChange page component that handles mandatory password changes
 * for users. Includes interactive password validation, biometric registration for mobile
 * devices, and playful UI elements to encourage strong password creation.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Alert, Card, CardContent, Box } from '@mui/material';
import { LoginContainer } from '../components/auth/LoginContainer';
import { changePassword, getUserData } from '../services/auth';
import { checkBiometricCapability, registerBiometric, hasBiometricRegistered } from '../utils/biometricAuth';
import { useAuth } from '../contexts/AuthContext';

/**
 * Password requirements interface for tracking validation state
 */
interface PasswordRequirements {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
}

/**
 * ForcePasswordChange page component that handles mandatory password changes.
 * Features:
 * - Interactive password validation with real-time feedback
 * - Playful UI elements (moving submit button, flashing requirements)
 * - Mobile device detection for biometric registration
 * - Password strength requirements:
 *   - Minimum 8 characters
 *   - Uppercase and lowercase letters
 *   - Numbers and special symbols
 * - Automatic redirection for users not requiring password change
 * 
 * @returns The rendered ForcePasswordChange page
 */
const ForcePasswordChange: React.FC = () => {
    const navigate = useNavigate();
    const { setIsAuthenticated, setUser } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [requirementsMet, setRequirementsMet] = useState<PasswordRequirements>({
        minLength: false,
        uppercase: false,
        lowercase: false,
        number: false,
        symbol: false,
    });
    const [buttonPositionX, setButtonPositionX] = useState('center');
    const [flashingKeys, setFlashingKeys] = useState<string[]>([]); // Keys that are flashing
    const [isFlashingDark, setIsFlashingDark] = useState(false); // Tracks flash state

    const isMobile = /Mobi|Android/i.test(navigator.userAgent); // Check if user is on mobile

    /**
     * Effect hook to check if user needs to change password.
     * Redirects to home if password change is not required.
     */
    useEffect(() => {
        const userData = getUserData();
        if (!userData?.force_password_change) {
            navigate('/');
        }
    }, [navigate]);

    /**
     * Effect hook to validate password requirements in real-time.
     * Updates requirement states as user types.
     */
    useEffect(() => {
        setRequirementsMet({
            minLength: newPassword.length >= 8,
            uppercase: /[A-Z]/.test(newPassword),
            lowercase: /[a-z]/.test(newPassword),
            number: /[0-9]/.test(newPassword),
            symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
        });
    }, [newPassword]);

    /**
     * Effect hook to handle submit button position.
     * Centers button when all requirements are met.
     */
    useEffect(() => {
        const allMet = Object.values(requirementsMet).every(Boolean);
        if (allMet) {
            setButtonPositionX('center');
        }
    }, [requirementsMet]);

    const handleButtonHover = () => {
        if (!isMobile && !allCriteriaMet()) {
            runAway();
            triggerFlashingEffect(); // Trigger flashing text on hover
        }
    };

    const handleButtonClick = (event: React.FormEvent) => {
        event.preventDefault();
        if (!allCriteriaMet()) {
            if (isMobile) {
                runAway(); // Only run away on mobile click
            }
            triggerFlashingEffect(); // Trigger flashing text
            return;
        }

        handleSubmit();
    };

    const allCriteriaMet = () => {
        return Object.values(requirementsMet).every(Boolean);
    };

    const runAway = () => {
        const randomX = Math.random() * 60; // Horizontal offset
        setButtonPositionX(`${randomX}%`);
    };

    const triggerFlashingEffect = () => {
        const unmetKeys = Object.entries(requirementsMet)
            .filter(([_, met]) => !met)
            .map(([key]) => key);

        setFlashingKeys(unmetKeys);

        let flashCount = 0;
        const flashInterval = setInterval(() => {
            setIsFlashingDark((prev) => !prev); // Toggle between normal and dark red
            flashCount++;

            if (flashCount >= 8) {
                // Stop flashing after 4 full flashes (8 toggles)
                clearInterval(flashInterval);
                setFlashingKeys([]);
                setIsFlashingDark(false);
            }
        }, 150); // Toggle every 150ms
    };

    const handleSubmit = async () => {
        setMessage('');
        setError('');
        setButtonPositionX('center'); // Return button to center

        try {
            const response = await changePassword(newPassword);
            setMessage('Password changed successfully!');

            // Update auth context with new user data
            setIsAuthenticated(true);
            setUser({
                id: response.id,
                username: response.username,
                email: response.email,
                is_staff: response.is_staff,
                is_admin: response.is_staff,
                force_password_change: false
            });

            // Try to register biometrics if available and not already registered
            try {
                const canUseBiometrics = await checkBiometricCapability();
                if (canUseBiometrics && !hasBiometricRegistered(response.username)) {
                    const credentialId = await registerBiometric(response.username);
                    if (!credentialId && isMobile) {
                        console.error('Failed to register biometrics on mobile device');
                    }
                }
            } catch (biometricError) {
                // Only log error on mobile devices
                if (isMobile) {
                    console.error('Failed to register biometrics:', biometricError);
                }
                // Continue even if biometric registration fails
            }

            // Navigate based on user role
            setTimeout(() => {
                if (response.is_staff) {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }, 2000);
        } catch (err) {
            setError((err as any).message || 'Failed to change password');
        }
    };

    const getCriteriaText = (key: string) => {
        switch (key) {
            case 'minLength':
                return 'At least 8 characters';
            case 'uppercase':
                return 'At least 1 uppercase letter';
            case 'lowercase':
                return 'At least 1 lowercase letter';
            case 'number':
                return 'At least 1 number';
            case 'symbol':
                return 'At least 1 symbol';
            default:
                return '';
        }
    };

    return (
        <LoginContainer>
            <Typography
                variant="h5"
                gutterBottom
                className="login-header"
                sx={{
                    fontSize: { xs: '4.5vw', sm: '2.5vw', md: '1.5vw' },
                    textAlign: 'center',
                }}
            >
                Change Password Required
            </Typography>
            <Typography
                variant="body1"
                gutterBottom
                sx={{
                    textAlign: 'center',
                    mb: 3,
                    color: 'text.secondary'
                }}
            >
                Your password needs to be changed before continuing.
            </Typography>
            <form onSubmit={handleButtonClick}>
                <TextField
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                />
                <Card sx={{ mt: 2 }}>
                    <CardContent>
                        {Object.entries(requirementsMet).map(([key, met]) => (
                            <Typography
                                key={key}
                                variant="body2"
                                className="password-criteria"
                                sx={{
                                    color: flashingKeys.includes(key)
                                        ? isFlashingDark
                                            ? '#b71c1c' // Darker red during flash
                                            : '#f44336' // Normal red during flash
                                        : met
                                            ? '#4caf50' // Green for met criteria
                                            : '#f44336', // Normal red for unmet criteria
                                    fontWeight: flashingKeys.includes(key) ? 'bold' : 'normal',
                                    transition: flashingKeys.includes(key)
                                        ? 'none' // Disable transition during flashing
                                        : 'color 0.3s ease, font-weight 0.3s ease', // Smooth transition
                                }}
                            >
                                {getCriteriaText(key)}
                            </Typography>
                        ))}
                    </CardContent>
                </Card>
                <Box
                    sx={{
                        mt: 4,
                        position: 'relative',
                        height: '100px',
                        width: '100%',
                        overflow: 'hidden', // Prevent button from leaving the container
                    }}
                >
                    <Button
                        type="button"
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: '50%', // Always vertically centered
                            left: buttonPositionX === 'center' ? '50%' : buttonPositionX,
                            transform:
                                buttonPositionX === 'center'
                                    ? 'translate(-50%, -50%)'
                                    : 'translateY(-50%)',
                            minWidth: '120px',
                            boxShadow: 'none', // Remove white box
                        }}
                        onMouseEnter={handleButtonHover}
                        onClick={handleButtonClick}
                    >
                        Change Password
                    </Button>
                </Box>
            </form>
            {message && <Alert severity="success">{message}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
        </LoginContainer>
    );
};

export default ForcePasswordChange;
