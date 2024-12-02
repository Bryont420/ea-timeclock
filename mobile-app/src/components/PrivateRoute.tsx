/**
 * @fileoverview Protected route component that ensures only authenticated users can
 * access certain routes in the application. Unauthenticated users are automatically
 * redirected to the login page.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Props interface for the PrivateRoute component.
 */
interface PrivateRouteProps {
  /** Child components to be rendered if user is authenticated */
  children: React.ReactNode;
}

/**
 * PrivateRoute component that acts as a wrapper for protected routes.
 * It checks if the current user is authenticated before rendering its children.
 * If the user is not authenticated, they are redirected to the login page.
 * 
 * @example
 * ```tsx
 * <PrivateRoute>
 *   <Dashboard />
 * </PrivateRoute>
 * ```
 * 
 * @param props - Component props
 * @param props.children - The child components to render if user is authenticated
 * @returns The protected route component
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
