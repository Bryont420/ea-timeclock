/**
 * @fileoverview Protected route component that ensures only admin users can access
 * certain routes in the application. Non-admin users are automatically redirected
 * to the dashboard.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminRoute component that acts as a wrapper for admin-only routes.
 * It checks if the current user is both authenticated and has admin privileges.
 * If either condition is not met, the user is redirected to the dashboard.
 * 
 * @example
 * ```tsx
 * <AdminRoute>
 *   <AdminDashboard />
 * </AdminRoute>
 * ```
 * 
 * @param props - Component props
 * @param props.children - The child components to render if user is an admin
 * @returns The protected route component
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user?.is_staff) {
        // Redirect non-admin users to dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
