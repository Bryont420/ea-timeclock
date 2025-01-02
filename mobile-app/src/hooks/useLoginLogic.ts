/**
 * @fileoverview Custom hook that manages login form logic, including biometric
 * authentication support for mobile devices. Handles form state, validation,
 * error handling, and authentication flow.
 */

import { useState, useEffect } from 'react';
import { login } from '../services/auth';
import { useBackground } from '../contexts/BackgroundContext';
import { useAuth } from '../contexts/AuthContext';
import { APIError } from '../utils/apiErrors';
import { isMobileDevice } from '../utils/deviceDetection';
import { verifyBiometric, hasBiometricRegistered, checkBiometricCapability, registerBiometric } from '../utils/biometricAuth';
import { getEmployeeInfo } from '../services/employee';

/**
 * Custom hook that provides login form functionality.
 * Features:
 * - Username/password form state management
 * - Biometric authentication support for mobile devices
 * - Error handling and validation
 * - Loading state management
 * - Username persistence for mobile devices
 * - Background refresh after successful login
 * - Employee info fetching for non-admin users
 * 
 * @returns Object containing:
 * - Form state (username, password)
 * - Form setters (setUsername, setPassword)
 * - Error and loading states
 * - Form submission handler
 * - Biometric authentication state and handlers
 */
export const useLoginLogic = () => {
    const [username, setUsername] = useState(() => {
        if (isMobileDevice()) {
            return localStorage.getItem('lastUsername') || '';
        }
        return '';
    });
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

    const { refreshBackground } = useBackground();
    const { setIsAuthenticated, setUser } = useAuth();

    /**
     * Checks biometric authentication availability on component mount
     * and when username changes. Updates biometric availability state.
     */
    useEffect(() => {
        const checkBiometric = async () => {
            try {
                if (isMobileDevice()) {
                    const isAvailable = await checkBiometricCapability();
                    
                    if (isAvailable && username) {
                        const isRegistered = hasBiometricRegistered(username);
                        setIsBiometricAvailable(isRegistered);
                    } else {
                        setIsBiometricAvailable(false);
                    }
                } else {
                    setIsBiometricAvailable(false);
                }
            } catch (error) {
                setIsBiometricAvailable(false);
            }
        };
        
        checkBiometric();
    }, [username]);

    /**
     * Handles form submission for both password and biometric login.
     * Validates credentials, updates authentication state, and handles errors.
     * 
     * @param e - Form event with optional biometric properties
     */
    const handleSubmit = async (e: React.FormEvent & { isBiometric?: boolean; biometricCredential?: any }) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await login(
                username,
                password,
                e.isBiometric || false,
                e.biometricCredential
            );

            if (isMobileDevice()) {
                localStorage.setItem('lastUsername', username);
                
                // Only try to register biometrics if password doesn't need to be changed
                if (!e.isBiometric && !response.force_password_change) {
                    try {
                        const isAvailable = await checkBiometricCapability();
                        const isRegistered = hasBiometricRegistered(username);
                        
                        if (isAvailable && !isRegistered) {
                            await registerBiometric(username);
                            setIsBiometricAvailable(true);
                        }
                    } catch (error) {
                        // Don't block the login process if biometric registration fails
                    }
                }
            }

            // Only fetch employee info for non-staff users
            let employeeInfo = null;
            if (!response.is_staff) {
                try {
                    employeeInfo = await getEmployeeInfo();
                } catch (error) {
                    // Don't fail the login if employee info fetch fails
                }
            }

            // Set user data
            const userData = {
                id: response.id,
                username: response.username,
                email: response.email,
                is_staff: response.is_staff,
                is_admin: response.is_staff,
                force_password_change: response.force_password_change,
                employee: employeeInfo
            };

            // Set authentication and user data
            setIsAuthenticated(true);
            setUser(userData);

            // Refresh background after user context is updated
            setTimeout(() => {
                refreshBackground();
            }, 100);

            setLoading(false);
            return response;
        } catch (err) {
            const message = err instanceof APIError ? err.message : 'Login failed';
            setError(message);
            setLoading(false);
            return null;
        }
    };

    /**
     * Handles biometric login flow.
     * Verifies biometric credentials, handles errors, and triggers form submission.
     */
    const handleBiometricLogin = async () => {
        if (!username.trim()) {
            setError('Please enter your username');
            return null;
        }

        setError('');
        setLoading(true);

        try {
            const { verified, credential, needsReregistration } = await verifyBiometric(username);
            
            if (needsReregistration) {
                setLoading(false);
                setError('Please log in with your password to re-register your biometrics');
                return null;
            }
            
            if (!verified || !credential) {
                setLoading(false);
                throw new Error('Biometric verification failed');
            }

            const syntheticEvent = {
                preventDefault: () => {},
                isBiometric: true,
                biometricCredential: credential
            } as React.FormEvent & { 
                isBiometric: boolean; 
                biometricCredential: any 
            };

            const response = await handleSubmit(syntheticEvent);
            return response;
        } catch (err) {
            const message = err instanceof APIError ? err.message : 'Biometric authentication failed';
            setError(message);
            setLoading(false);
            throw err;
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        error,
        loading,
        handleSubmit,
        handleBiometricLogin,
        isBiometricAvailable
    };
};
