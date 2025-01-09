import React, { useState } from 'react';
import { TextField, Button, Typography, Alert, Box } from '@mui/material';
import { requestPasswordReset } from '../services/passwordResetService';
import { LoginContainer } from '../components/auth/LoginContainer';
import { useNavigate } from 'react-router-dom';

const PasswordResetRequest: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await requestPasswordReset(userId, email);
      setMessage(response.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError((err as any).error || 'An error occurred. Please try again.');
    }
  };

  return (
    <LoginContainer>
      <Typography
        variant="h4"
        gutterBottom
        className="login-header"
        sx={{ fontSize: { xs: '5vw', sm: '3vw', md: '2vw' }, textAlign: 'center' }}
      >
        Password Reset Request
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Request Password Reset
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

export default PasswordResetRequest;
