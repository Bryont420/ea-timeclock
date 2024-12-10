import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/auth';
import { useBackground } from '../contexts/BackgroundContext';
import { useAuth } from '../contexts/AuthContext';
import { APIError } from '../utils/apiErrors';

export const useLoginLogic = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    const { resetToDefault, refreshBackground } = useBackground();
    const { setIsAuthenticated, setUser } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Input validation
        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await login(username, password);
            
            if (!response || !response.access) {
                throw new APIError('Invalid username or password', 401);
            }

            // Set user data first
            const userData = {
                id: response.id,
                username: response.username,
                email: response.email,
                is_staff: response.is_staff,
                is_admin: response.is_staff,
                force_password_change: response.force_password_change
            };
            
            // Update context and local storage
            setUser(userData);
            sessionStorage.setItem('user', JSON.stringify(userData));
            
            // Set authentication state after user data is set
            setIsAuthenticated(true);
            
            // Refresh background in case user has a custom one
            try {
                await refreshBackground();
            } catch (err) {
                console.error('Background refresh error:', err);
                // Don't block login if background refresh fails
            }

            // Only navigate if we're authenticated and not already on the target path
            const targetPath = response.is_staff ? '/admin' : '/dashboard';
            if (location.pathname !== targetPath) {
                navigate(targetPath);
            }
        } catch (err) {
            console.error('Login error:', err);
            
            // Clear any existing auth state
            setIsAuthenticated(false);
            setUser(null);
            
            // Handle different types of errors
            if (err instanceof APIError) {
                setError(err.message);
            } else if (err instanceof Error) {
                if (err.message.includes('Network Error')) {
                    setError('Unable to connect to server. Please check your internet connection.');
                } else {
                    setError('Invalid username or password');
                }
            } else {
                setError('Invalid username or password');
            }
            
            // Clear password on error
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return {
        username,
        password,
        error,
        loading,
        setUsername,
        setPassword,
        handleSubmit,
        resetToDefault
    };
};
