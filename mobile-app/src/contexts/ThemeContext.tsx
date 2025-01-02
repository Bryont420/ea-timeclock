/**
 * @fileoverview Theme context provider that manages the application's theme state.
 * Handles theme switching, persistence, and provides theme options to components.
 * Includes hover theme preview functionality and server-side theme preference storage.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { axiosInstance } from '../utils/axios';
import { useAuth } from './AuthContext';
import { themes, ThemeOption } from '../themes';

/**
 * Interface defining the shape of the theme context.
 */
interface ThemeContextType {
    /** Currently active theme */
    currentTheme: ThemeOption;
    /** Function to change the active theme */
    setTheme: (themeId: string) => void;
    /** List of available themes */
    availableThemes: ThemeOption[];
    /** Function to set the preview theme on hover */
    setHoverTheme: (theme: ThemeOption | null) => void;
}

/** Theme context with default values */
const ThemeContext = createContext<ThemeContextType>({
    currentTheme: themes[0],
    setTheme: () => {},
    availableThemes: themes,
    setHoverTheme: () => {},
});

/**
 * Custom hook to access the theme context.
 * @returns The theme context value
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * Props interface for the ThemeProvider component.
 */
interface ThemeProviderProps {
    /** Child components to be wrapped by the provider */
    children: React.ReactNode;
}

/**
 * Theme provider component that manages theme state and preferences.
 * Features:
 * - Theme persistence across sessions
 * - Server-side theme preference storage
 * - Theme preview on hover
 * - Cooldown mechanism to prevent excessive API calls
 * - Automatic theme loading for authenticated users
 * 
 * @param props - Component props
 * @param props.children - Child components to wrap with theme context
 * @returns The theme provider component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Find the dark theme from predefined themes
    const darkTheme = themes.find(t => t.id === 'dark') || themes[0];
    const [currentTheme, setCurrentTheme] = useState<ThemeOption>(darkTheme);
    const [hoverTheme, setHoverTheme] = useState<ThemeOption | null>(null);
    const { user } = useAuth();
    const currentUserRef = useRef<number | null>(null);
    const lastFetchTime = useRef<number>(0);
    const FETCH_COOLDOWN = 2000; // 2 seconds cooldown between fetches
    const isLoadingTheme = useRef(false);

    /**
     * Sets the active theme and persists it to the server if user is authenticated.
     * 
     * @param themeId - ID of the theme to set
     */
    const setTheme = useCallback(async (themeId: string) => {
        const theme = themes.find((t) => t.id === themeId);
        if (theme) {
            setCurrentTheme(theme);
            if (user) {
                try {
                    await axiosInstance.post('/api/user/preferences/theme/update/', { themeId });
                } catch (error) {
                    console.error('Failed to save theme preference:', error);
                }
            }
        }
    }, [user]);

    /**
     * Resets the theme to the default dark theme and clears user theme preference.
     */
    const resetTheme = useCallback(() => {
        setCurrentTheme(darkTheme);
        currentUserRef.current = null;
        lastFetchTime.current = Date.now();
        isLoadingTheme.current = false;
    }, [darkTheme]);

    /**
     * Loads the user's theme preference from the server.
     */
    const loadUserTheme = useCallback(async () => {
        if (isLoadingTheme.current) {
            console.debug('Already loading theme, skipping');
            return;
        }

        const now = Date.now();
        if (now - lastFetchTime.current < FETCH_COOLDOWN) {
            console.debug('Skipping theme refresh due to cooldown');
            return;
        }

        lastFetchTime.current = now;
        isLoadingTheme.current = true;

        try {
            const response = await axiosInstance.get('/api/user/preferences/theme/');
            const userThemeId = response.data.themeId;
            const userTheme = themes.find((t) => t.id === userThemeId);
            if (userTheme) {
                setCurrentTheme(userTheme);
            }
        } catch (error) {
            console.error('Failed to load user theme:', error);
            setCurrentTheme(darkTheme);
        } finally {
            isLoadingTheme.current = false;
        }
    }, [darkTheme]);

    // Handle user changes and authentication status
    useEffect(() => {
        if (!user || user.force_password_change) {
            console.debug('User not authenticated or needs password change, resetting theme');
            resetTheme();
            return;
        }

        // Check if user has changed
        if (currentUserRef.current !== user.id) {
            console.debug('User changed, updating theme');
            currentUserRef.current = user.id;
            // Don't reset to dark theme here, just load the user's theme
            loadUserTheme();
        }
    }, [user, resetTheme, loadUserTheme]);

    // Handle storage events for cross-tab synchronization
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' || e.key === 'user') {
                const userData = e.key === 'user' && e.newValue ? JSON.parse(e.newValue) : null;
                if (!userData || userData.force_password_change) {
                    console.debug('Storage changed, resetting theme');
                    resetTheme();
                } else {
                    // Don't reset to dark theme, just reload user theme
                    loadUserTheme();
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [resetTheme, loadUserTheme]);

    /**
     * Creates a MUI theme object based on the current theme.
     * 
     * @returns The MUI theme object
     */
    const theme = useMemo(() => {
        const activeTheme = hoverTheme || currentTheme;
        return createTheme({
            palette: activeTheme.palette,
            components: {
                MuiAppBar: {
                    styleOverrides: {
                        root: {
                            backgroundColor: activeTheme.palette.primary.main,
                            color: activeTheme.palette.mode === 'light' ? '#fff' : '#fff',
                        },
                    },
                },
                MuiToolbar: {
                    styleOverrides: {
                        root: {
                            backgroundColor: activeTheme.palette.primary.main,
                            color: activeTheme.palette.mode === 'light' ? '#fff' : '#fff',
                        },
                    },
                },
                MuiTypography: {
                    defaultProps: {
                        variantMapping: {
                            h1: 'h1',
                            h2: 'h2',
                            h3: 'h3',
                            h4: 'h4',
                            h5: 'h5',
                            h6: 'h6',
                            subtitle1: 'h2',
                            subtitle2: 'h2',
                            body1: 'p',
                            body2: 'p',
                        },
                    },
                    styleOverrides: {
                        root: {
                            // Specific styles for named headers
                            '&.app-header, &.login-header, &.employee-header, &.MuiFormControlLabel-label': {
                                backgroundColor: 'transparent',
                            },
                            // Specific styles for password criteria
                            '&.password-criteria': {
                                backgroundColor: 'transparent',
                                padding: 0,
                                borderRadius: 0,
                                '&.met': {
                                    color: '#4caf50',
                                },
                                '&.unmet': {
                                    color: '#f44336',
                                },
                            },
                            // Default style for other headers
                            '&:not(.login-header):not(.app-header):not(.employee-header):not(.password-criteria):not(.MuiFormControlLabel-label)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },      
                        },
                        // Override for h1-h6 styles
                        h1: {
                            '&:not(.login-header):not(.app-header):not(.employee-header)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },
                        },
                        h2: {
                            '&:not(.login-header):not(.app-header):not(.employee-header)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },
                        },
                        h3: {
                            '&:not(.login-header):not(.app-header):not(.employee-header)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },
                        },
                        h4: {
                            '&:not(.login-header):not(.app-header):not(.employee-header)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },
                        },
                        h5: {
                            '&:not(.login-header):not(.app-header):not(.employee-header)': {
                                backgroundColor: activeTheme.palette.background.default,
                                color: activeTheme.palette.text.primary,
                                padding: '8px 16px',
                                borderRadius: '4px',
                            },
                        },
                    },
                },
            },
        });
    }, [currentTheme, hoverTheme]);

    /**
     * Creates the theme context value.
     * 
     * @returns The theme context value
     */
    const contextValue = useMemo(() => ({
        currentTheme,
        setTheme,
        availableThemes: themes,
        setHoverTheme,
    }), [currentTheme, setTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
