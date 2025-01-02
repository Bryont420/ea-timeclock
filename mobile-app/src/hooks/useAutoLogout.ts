/**
 * @fileoverview Custom hook that manages automatic logout functionality based on user
 * inactivity. Tracks user activity and logs out after a specified period of inactivity.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';
import { useBackground } from '../contexts/BackgroundContext';
import { useAuth } from '../contexts/AuthContext';

/** Inactivity timeout duration in milliseconds (15 minutes) */
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

/**
 * Custom hook that provides automatic logout functionality.
 * Features:
 * - Tracks user activity through mouse and keyboard events
 * - Logs out after 15 minutes of inactivity
 * - Resets timer on any user activity
 * - Cleans up event listeners on unmount
 * - Only active when user is authenticated
 * 
 * @returns void
 */
export const useAutoLogout = () => {
    const navigate = useNavigate();
    const { resetToDefault } = useBackground();
    const { isAuthenticated } = useAuth();
    const inactivityTimer = useRef<NodeJS.Timeout>();

    /**
     * Handles the logout process by resetting background,
     * logging out the user, and navigating to home.
     */
    const handleLogout = useCallback(() => {
        resetToDefault();
        logout();
        navigate('/');
    }, [navigate, resetToDefault]);

    /**
     * Resets the inactivity timer to the initial timeout duration.
     * If the user is not authenticated, the timer is cleared.
     */
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
        }
        if (isAuthenticated) {
            inactivityTimer.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        }
    }, [handleLogout, isAuthenticated]);

    /**
     * Sets up the effect to track user activity and reset the inactivity timer.
     * If the user is not authenticated, the timer is cleared.
     */
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
