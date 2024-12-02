import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';
import { useBackground } from '../contexts/BackgroundContext';
import { useAuth } from '../contexts/AuthContext';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const useAutoLogout = () => {
    const navigate = useNavigate();
    const { resetToDefault } = useBackground();
    const { isAuthenticated } = useAuth();
    const inactivityTimer = useRef<NodeJS.Timeout>();

    const handleLogout = useCallback(() => {
        resetToDefault();
        logout();
        navigate('/');
    }, [navigate, resetToDefault]);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }
        if (isAuthenticated) {
            inactivityTimer.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        }
    }, [handleLogout, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            // Clear the timer if we're not authenticated
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            return;
        }

        // Set up activity listeners
        const activityEvents = [
            'mousedown',
            'keydown',
            'touchstart',
            'mousemove'
        ];

        // Initial timer setup
        resetInactivityTimer();

        // Reset timer on any activity
        const handleActivity = () => {
            resetInactivityTimer();
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            activityEvents.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [resetInactivityTimer, isAuthenticated]);
};
