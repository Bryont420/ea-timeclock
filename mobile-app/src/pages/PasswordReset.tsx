import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Alert, Card, CardContent, Box } from '@mui/material';
import { LoginContainer } from '../components/auth/LoginContainer';
import { resetPassword } from '../services/passwordResetService';

const PasswordReset: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
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

  useEffect(() => {
    setRequirementsMet({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await resetPassword(token!, newPassword);
      setMessage(response.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError((err as any).error || 'An error occurred. Please try again.');
    }
  };

  const allRequirementsMet = Object.values(requirementsMet).every(Boolean);

  return (
    <LoginContainer>
      <Typography
        variant="h5"
        gutterBottom
        className="login-header"
        sx={{ fontSize: { xs: '4.5vw', sm: '2.5vw', md: '1.5vw' }, textAlign: 'center' }}
      >
        Reset Your Password
      </Typography>
      <form onSubmit={handleSubmit}>
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
            <Typography
              variant="body2"
              sx={{ color: requirementsMet.minLength ? 'green' : 'red' }}
            >
              At least 8 characters
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: requirementsMet.uppercase ? 'green' : 'red' }}
            >
              At least 1 uppercase letter
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: requirementsMet.lowercase ? 'green' : 'red' }}
            >
              At least 1 lowercase letter
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: requirementsMet.number ? 'green' : 'red' }}
            >
              At least 1 number
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: requirementsMet.symbol ? 'green' : 'red' }}
            >
              At least 1 symbol
            </Typography>
          </CardContent>
        </Card>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={!allRequirementsMet}
        >
          Reset Password
        </Button>
      </form>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button
          component="a"
          href="/login"
          variant="text"
          size="small"
        >
          Back to Login
        </Button>
      </Box>
    </LoginContainer>
  );
};

export default PasswordReset;
