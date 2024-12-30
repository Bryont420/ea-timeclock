/**
 * @fileoverview Authentication context provider that manages user authentication state
 * and user information throughout the application. Handles both admin and employee
 * authentication flows, including token management and user data persistence.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, logout as authLogout, getUserData } from '../services/auth';
import { getEmployeeInfo, EmployeeInfo } from '../services/employee';

/**
 * Interface representing a user in the system.
 */
interface User {
    /** Unique identifier for the user */
    id: number;
    /** Username (full name for employees) */
    username: string;
    /** User's email address */
    email: string;
    /** Whether the user has staff privileges */
    is_staff: boolean;
    /** Whether the user has admin privileges */
    is_admin: boolean;
    /** Whether the user needs to change their password */
    force_password_change: boolean;
    /** Additional employee information for non-admin users */
    employee?: EmployeeInfo | null;
}

/**
 * Interface defining the shape of the authentication context.
 */
interface AuthContextType {
    /** Whether the user is currently authenticated */
    isAuthenticated: boolean;
    /** Function to update authentication state */
    setIsAuthenticated: (value: boolean) => void;
    /** Function to log out the current user */
    logout: () => void;
    /** Current user information */
    user: User | null;
    /** Function to update user information */
    setUser: (user: User | null) => void;
}

/** Authentication context with default values */
export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    logout: () => {},
    user: null,
    setUser: () => {},
});

/** Hook to access the authentication context */
export const useAuth = () => useContext(AuthContext);

/**
 * Authentication Provider component that manages user authentication state.
 * Features:
 * - Automatic token validation and user data fetching
 * - Different authentication flows for admin and regular employees
 * - Persistent authentication state across page reloads
 * - Centralized logout functionality
 * 
 * @param children - Child components to be wrapped by the provider
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const token = getToken();
        return !!token;
    });

    const [user, setUser] = useState<User | null>(() => {
        const savedUser = sessionStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const token = getToken();

    useEffect(() => {
        if (token) {
            // First get the stored user data which includes staff status
            const storedUserData = getUserData();
            if (!storedUserData) {
                console.error('No user data found in session storage');
                setUser(null);
                setIsAuthenticated(false);
                sessionStorage.removeItem('user');
                return;
            }

            // If the user is an admin/staff, we don't need to fetch employee info
            if (storedUserData.is_staff) {
                const userData: User = {
                    id: storedUserData.id,
                    username: storedUserData.username,
                    email: storedUserData.email,
                    is_staff: true,
                    is_admin: true,
                    force_password_change: storedUserData.force_password_change,
                    employee: null
                };
                setUser(userData);
                setIsAuthenticated(true);
                sessionStorage.setItem('user', JSON.stringify(userData));
                return;
            }

            // For regular employees, get the employee info
            getEmployeeInfo()
                .then(data => {
                    const userData: User = {
                        id: storedUserData.id,
                        username: storedUserData.username,
                        email: storedUserData.email,
                        is_staff: false,
                        is_admin: false,
                        force_password_change: storedUserData.force_password_change,
                        employee: data
                    };
                    setUser(userData);
                    setIsAuthenticated(true);
                    sessionStorage.setItem('user', JSON.stringify(userData));
                })
                .catch((error) => {
                    console.error('Error fetching employee info:', error);
                    // If employee info fetch fails, log out non-staff users
                    setUser(null);
                    setIsAuthenticated(false);
                    sessionStorage.removeItem('user');
                });
        } else {
            setUser(null);
            setIsAuthenticated(false);
            sessionStorage.removeItem('user');
        }
    }, [token]);

    const logout = useCallback(() => {
        authLogout();
        setUser(null);
        setIsAuthenticated(false);
        // Remove your app-specific session items
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
          
        // --- Clear Google Analytics session items ---
        // This removes the GA4 session keys you created in Analytics.ts
        sessionStorage.removeItem('_ga_sessionId');
        sessionStorage.removeItem('_ga_sessionStart');
          
        // If you also want to remove offline analytics events saved in localStorage:
        localStorage.removeItem('_ga_offline_events');
          
        // If you want to reset the GA Client ID on logout, remove it from localStorage:
        localStorage.removeItem('_ga_clientId');
          
        // Finally, clear any other sessionStorage items (optional if you want a blanket reset)
        sessionStorage.clear();

    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
