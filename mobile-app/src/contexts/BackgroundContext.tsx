/**
 * @fileoverview Background context provider that manages the application's background image state.
 * Handles background image loading, caching, and updates based on user authentication status
 * and user type (admin/regular user). Includes cooldown mechanisms to prevent excessive API calls.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getBackgroundImage } from '../services/background';
import { STATIC_BASE_URL } from '../config';
import { useAuth } from './AuthContext';

/**
 * Interface for responsive background images
 */
interface ResponsiveBackgroundImages {
    small: { webp: string; jpg: string };
    medium: { webp: string; jpg: string };
    large: { webp: string; jpg: string };
}

/**
 * Interface defining the shape of the BackgroundContext.
 */
interface BackgroundContextType {
    /** Current background image URLs for different sizes */
    backgroundImage: ResponsiveBackgroundImages;
    /** Function to reset background to default image */
    resetToDefault: () => void;
    /** Function to fetch and update background image */
    refreshBackground: () => Promise<void>;
}

/** Default background image paths */
const DEFAULT_BACKGROUND: ResponsiveBackgroundImages = {
    small: {
        webp: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-small.webp`,
        jpg: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-small.jpg`
    },
    medium: {
        webp: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-medium.webp`,
        jpg: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-medium.jpg`
    },
    large: {
        webp: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-large.webp`,
        jpg: `${STATIC_BASE_URL}/images/employee_backgrounds/employee-info-background-large.jpg`
    }
};

/**
 * Constructs the full background image paths for both WebP and JPG formats in different sizes.
 * 
 * @param filename - The name of the background image file (e.g., "background.jpg")
 * @param isAdmin - Whether the current user is an admin
 * @returns Object containing paths for different sizes in both WebP and JPG formats
 */
const getBackgroundPaths = (filename: string | null, isAdmin: boolean): ResponsiveBackgroundImages => {
    if (!filename) return DEFAULT_BACKGROUND;
    
    const directory = isAdmin ? 'admin_backgrounds' : 'employee_backgrounds';
    const basePath = `${STATIC_BASE_URL}/images/${directory}`;
    const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    
    return {
        small: {
            webp: `${basePath}/${baseFilename}-small.webp`,
            jpg: `${basePath}/${baseFilename}-small.jpg`
        },
        medium: {
            webp: `${basePath}/${baseFilename}-medium.webp`,
            jpg: `${basePath}/${baseFilename}-medium.jpg`
        },
        large: {
            webp: `${basePath}/${baseFilename}-large.webp`,
            jpg: `${basePath}/${baseFilename}-large.jpg`
        }
    };
};

/** Background context with default values */
const BackgroundContext = createContext<BackgroundContextType>({
    backgroundImage: DEFAULT_BACKGROUND,
    resetToDefault: () => {},
    refreshBackground: async () => {},
});

/**
 * Custom hook to use the background context
 */
export const useBackground = () => useContext(BackgroundContext);

/**
 * Provider component for background image context
 * 
 * @param children - Child components to be wrapped by the provider
 */
export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [backgroundImage, setBackgroundImage] = useState<ResponsiveBackgroundImages>(DEFAULT_BACKGROUND);
    const { isAuthenticated, user } = useAuth();
    const lastFetchTime = useRef<number>(0);
    const FETCH_COOLDOWN = 2000; // 2 seconds cooldown between fetches
    const currentUserType = useRef<'admin' | 'user' | null>(null);

    /**
     * Resets the background image to the default image.
     */
    const resetToDefault = useCallback(() => {
        setBackgroundImage(DEFAULT_BACKGROUND);
        lastFetchTime.current = Date.now(); // Update lastFetchTime to prevent immediate fetch
    }, []);

    /**
     * Fetches and updates the background image.
     */
    const refreshBackground = useCallback(async () => {
        const now = Date.now();
        if (now - lastFetchTime.current < FETCH_COOLDOWN) {
            console.debug('Skipping background refresh due to cooldown');
            return;
        }

        // Always update lastFetchTime to prevent spam
        lastFetchTime.current = now;

        try {
            console.debug('Fetching background image for user:', { 
                isAuthenticated, 
                isStaff: user?.is_staff,
                currentType: currentUserType.current
            });

            const image = await getBackgroundImage();
            console.debug('Received background image:', image);

            const isAdmin = user?.is_staff || false;
            const paths = getBackgroundPaths(image, isAdmin);
            console.debug('Setting background paths:', paths);
            
            setBackgroundImage(paths);
        } catch (error) {
            console.error('Failed to fetch background image:', error);
            resetToDefault();
        }
    }, [user?.is_staff, isAuthenticated, resetToDefault]);

    /**
     * Handles changes in user authentication status.
     * Resets the background image and fetches a new one if necessary.
     */
    useEffect(() => {
        if (!isAuthenticated) {
            console.debug('User not authenticated, resetting background');
            resetToDefault();
            currentUserType.current = null;
            return;
        }

        const newUserType = user?.is_staff ? 'admin' : 'user';
        console.debug('Checking user type change:', {
            current: currentUserType.current,
            new: newUserType
        });

        if (currentUserType.current !== newUserType) {
            console.debug('User type changed, updating background');
            currentUserType.current = newUserType;
            refreshBackground();
        }
    }, [isAuthenticated, user?.is_staff, resetToDefault, refreshBackground]);

    /**
     * Handles storage changes (logout/login) to synchronize background image state across tabs.
     */
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' || e.key === 'user') {
                console.debug('Storage changed, resetting background');
                resetToDefault();
                currentUserType.current = null;
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [resetToDefault]);

    return (
        <BackgroundContext.Provider value={{ backgroundImage, resetToDefault, refreshBackground }}>
            {children}
        </BackgroundContext.Provider>
    );
};

export default BackgroundContext;
