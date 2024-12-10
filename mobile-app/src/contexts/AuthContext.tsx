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
            
            // If the user is an admin, we don't need to fetch employee info
            if (storedUserData?.is_staff) {
                const userData: User = {
                    id: storedUserData.id,
                    username: storedUserData.username,
                    email: storedUserData.email,
                    is_staff: true,
                    is_admin: true,
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
                        id: parseInt(data.id, 10),
                        username: `${data.first_name} ${data.last_name}`,
                        email: storedUserData?.email || '',
                        is_staff: storedUserData?.is_staff || false,
                        is_admin: storedUserData?.is_staff || false,
                        employee: data
                    };
                    setUser(userData);
                    setIsAuthenticated(true);
                    sessionStorage.setItem('user', JSON.stringify(userData));
                })
                .catch((error) => {
                    console.error('Error fetching employee info:', error);
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
        sessionStorage.removeItem('user');
        // Force clear any remaining state
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.clear();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
