/**
 * @fileoverview Main layout component that provides the application's shell structure,
 * including the top app bar, bottom navigation, and content area. Handles navigation
 * and logout functionality, with different routes for admin and regular users.
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    BottomNavigation,
    BottomNavigationAction,
    Paper
} from '@mui/material';
import {
    ExitToApp as LogoutIcon,
    Dashboard as DashboardIcon,
    AccessTime as TimeIcon,
    EventAvailable as TimeOffIcon
} from '@mui/icons-material';
import { useBackground } from '../contexts/BackgroundContext';
import { useAuth } from '../contexts/AuthContext';
import { useAutoLogout } from '../hooks/useAutoLogout';
import ThemeSelector from './ThemeSelector';

/**
 * Props interface for the Layout component.
 */
interface LayoutProps {
    /** Child components to be rendered in the main content area */
    children: React.ReactNode;
}

/**
 * Layout component that provides the application's shell structure.
 * Features:
 * - Responsive app bar with title and logout button
 * - Bottom navigation with Dashboard, Time Entries, and Time Off sections
 * - Different navigation paths for admin and regular users
 * - Auto-logout functionality
 * - Background reset on logout
 * 
 * @param props - Component props
 * @param props.children - Child components to render in the main content area
 * @returns The layout component with navigation and content
 */
export const Layout = React.memo<LayoutProps>(({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { resetToDefault } = useBackground();
    const { user, logout: authLogout } = useAuth();

    // Set document title based on user type
    useEffect(() => {
        document.title = user?.is_staff ? 'Time Clock (Admin)' : 'Time Clock';
    }, [user]);

    // Initialize auto-logout
    useAutoLogout();

    /**
     * Handles logout functionality, including background reset and navigation to the login page.
     */
    const handleLogout = useCallback(async () => {
        resetToDefault(); // Reset background to default
        document.title = 'Time Clock'; // Reset title immediately
        await authLogout(); // Use auth context's logout
        navigate('/');
    }, [resetToDefault, navigate, authLogout]);

    /**
     * Returns the current navigation value based on the location pathname.
     * 
     * @returns The current navigation value (0, 1, or 2)
     */
    const getCurrentValue = useCallback(() => {
        if (location.pathname === '/dashboard' || location.pathname === '/admin') return 0;
        if (location.pathname === '/time-entries' || location.pathname === '/admin/time-entries') return 1;
        if (location.pathname === '/time-off' || location.pathname === '/admin/time-off') return 2;
        return 0;
    }, [location.pathname]);

    /**
     * Handles navigation to a specific path.
     * 
     * @param path - The path to navigate to
     * @returns A callback function to handle navigation
     */
    const handleNavigate = useCallback((path: string) => () => {
        navigate(path);
    }, [navigate]);

    return (
        <Box sx={{ pb: 7 }}>
            <AppBar position="static" sx={{ backgroundColor: 'background.paper' }}>
                <Toolbar>
                    <ThemeSelector />
                    <Typography 
                        variant="h6" 
                        component="div" 
                        className="app-header"
                        sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold', color: 'text.primary' }}
                    >
                        {user?.is_staff ? 'Admin Dashboard' : 'Employee Dashboard'}
                    </Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleLogout}
                    >
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            {children}
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                <BottomNavigation
                    value={getCurrentValue()}
                    showLabels
                >
                    <BottomNavigationAction
                        label="Dashboard"
                        icon={<DashboardIcon />}
                        onClick={handleNavigate(user?.is_staff ? '/admin' : '/dashboard')}
                    />
                    <BottomNavigationAction
                        label="Time Entries"
                        icon={<TimeIcon />}
                        onClick={handleNavigate(user?.is_staff ? '/admin/time-entries' : '/time-entries')}
                    />
                    <BottomNavigationAction
                        label="Time Off"
                        icon={<TimeOffIcon />}
                        onClick={handleNavigate(user?.is_staff ? '/admin/time-off' : '/time-off')}
                    />
                </BottomNavigation>
            </Paper>
        </Box>
    );
});

Layout.displayName = 'Layout';
