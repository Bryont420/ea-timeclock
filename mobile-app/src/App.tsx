import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { useAuth } from './contexts/AuthContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { Layout } from './components/Layout';
import { BackgroundManager } from './components/BackgroundManager';
import {
  CssBaseline,
  CircularProgress,
  Box,
  LocalizationProvider,
  AdapterDateFns
} from './utils/muiImports';

// React Router future flags
const routerFutureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Lazy load page components with error boundaries and chunk naming
const lazyWithRetry = (componentImport: () => Promise<any>, chunkName: string) => 
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );
    
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy load components with retry mechanism and named chunks
const Login = lazyWithRetry(() => import(/* webpackChunkName: "login" */ './pages/Login').then(module => ({ default: module.Login })), 'login');
const Dashboard = lazyWithRetry(() => import(/* webpackChunkName: "dashboard" */ './pages/Dashboard').then(module => ({ default: module.Dashboard })), 'dashboard');
const TimeEntries = lazyWithRetry(() => import(/* webpackChunkName: "time-entries" */ './pages/TimeEntries').then(module => ({ default: module.TimeEntries })), 'time-entries');
const TimeOff = lazyWithRetry(() => import(/* webpackChunkName: "time-off" */ './pages/TimeOff').then(module => ({ default: module.TimeOff })), 'time-off');
const AdminTimeOff = lazyWithRetry(() => import(/* webpackChunkName: "admin-time-off" */ './pages/AdminTimeOff').then(module => ({ default: module.AdminTimeOff })), 'admin-time-off');
const AdminDashboard = lazyWithRetry(() => import(/* webpackChunkName: "admin-dashboard" */ './pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })), 'admin-dashboard');
const AdminTimeEntries = lazyWithRetry(() => import(/* webpackChunkName: "admin-time-entries" */ './pages/AdminTimeEntries').then(module => ({ default: module.AdminTimeEntries })), 'admin-time-entries');
const PasswordResetRequest = lazyWithRetry(() => import(/* webpackChunkName: "password-reset" */ './pages/PasswordResetRequest').then(module => ({ default: module.default })), 'password-reset');
const PasswordReset = lazyWithRetry(() => import(/* webpackChunkName: "password-reset" */ './pages/PasswordReset').then(module => ({ default: module.default })), 'password-reset');

// Protected Route component with memoization and role-based access
const ProtectedRoute = React.memo(({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) => {
  const { isAuthenticated, user } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Handle admin access
  if (requireAdmin && !user?.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect admins to admin dashboard from employee routes
  if (user?.is_staff && window.location.pathname === '/dashboard') {
    return <Navigate to="/admin" replace />;
  }

  return <Layout>{children}</Layout>;
});

// Main App component
const App = () => {
  // Security headers
  useEffect(() => {
    // Add security headers
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';";
    document.head.appendChild(meta);
    
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Remove aria-hidden from root on mount
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.removeAttribute('aria-hidden');
    }
  }, []);

  return (
    <BrowserRouter future={routerFutureConfig}>
      <AuthProvider>
        <BackgroundProvider>
          <AdminProvider>
            <ThemeProvider>
              <CssBaseline />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <BackgroundManager>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Login />} />
                      <Route path="/login" element={<Navigate to="/" replace />} />
                      <Route path="/password-reset-request" element={<PasswordResetRequest />} />
                      <Route path="/reset-password/:token" element={<PasswordReset />} />
                      
                      {/* Employee Routes */}
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/time-entries" element={
                        <ProtectedRoute>
                          <TimeEntries />
                        </ProtectedRoute>
                      } />
                      <Route path="/time-off" element={
                        <ProtectedRoute>
                          <TimeOff />
                        </ProtectedRoute>
                      } />
                      
                      {/* Admin Routes */}
                      <Route path="/admin" element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/time-entries" element={
                        <ProtectedRoute requireAdmin>
                          <AdminTimeEntries />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/time-off" element={
                        <ProtectedRoute requireAdmin>
                          <AdminTimeOff />
                        </ProtectedRoute>
                      } />
                      
                      {/* Catch all route */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </BackgroundManager>
              </LocalizationProvider>
            </ThemeProvider>
          </AdminProvider>
        </BackgroundProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
