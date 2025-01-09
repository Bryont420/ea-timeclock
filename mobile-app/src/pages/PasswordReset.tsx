import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Alert, Card, CardContent, Box } from '@mui/material';
import { LoginContainer } from '../components/auth/LoginContainer';
import { resetPassword } from '../services/passwordResetService';
import { login } from '../services/auth';
import { checkBiometricCapability, registerBiometric, hasBiometricRegistered } from '../utils/biometricAuth';
import { useAuth } from '../contexts/AuthContext';

const PasswordReset: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requirementsMet, setRequirementsMet] = useState({
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

  // Update requirements met state based on password input
  useEffect(() => {
    setRequirementsMet({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  // Return button to center when all criteria are met
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
      const result = await resetPassword(token!, newPassword);
      
      if (result.success) {
        setMessage('Password reset successfully!');
        
        // Login with new password
        try {
          const loginResponse = await login(result.data.username, newPassword);
          
          // Update auth context
          setIsAuthenticated(true);
          setUser({
            id: loginResponse.id,
            username: loginResponse.username,
            email: loginResponse.email,
            is_staff: loginResponse.is_staff,
            is_admin: loginResponse.is_staff,
            force_password_change: loginResponse.force_password_change
          });

          // Try to register biometrics if available and not already registered
          try {
            const canUseBiometrics = await checkBiometricCapability();
            if (canUseBiometrics && !hasBiometricRegistered(result.data.username)) {
              const credentialId = await registerBiometric(result.data.username);
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
            if (result.data.is_staff) {
              navigate('/admin');
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        } catch (loginError) {
          console.error('Failed to login after password reset:', loginError);
          navigate('/');  // Redirect to login page if auto-login fails
        }
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError((err as any).error || 'An error occurred. Please try again.');
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
        Reset Your Password
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
            Confirm
          </Button>
        </Box>
      </form>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button component="a" href="/login" variant="text" size="small">
          Back to Login
        </Button>
      </Box>
    </LoginContainer>
  );
};

export default PasswordReset;
