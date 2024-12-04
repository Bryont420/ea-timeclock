import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { useAuth } from './contexts/AuthContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { Layout } from './components/Layout';
import { BackgroundManager } from './components/BackgroundManager';

// Lazy load page components
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const TimeEntries = lazy(() => import('./pages/TimeEntries').then(module => ({ default: module.TimeEntries })));
const TimeOff = lazy(() => import('./pages/TimeOff').then(module => ({ default: module.TimeOff })));
const AdminTimeOff = lazy(() => import('./pages/AdminTimeOff').then(module => ({ default: module.AdminTimeOff })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminTimeEntries = lazy(() => import('./pages/AdminTimeEntries').then(module => ({ default: module.AdminTimeEntries })));

// Protected Route component with memoization
const ProtectedRoute = React.memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Redirect admins to admin dashboard
  if (user?.is_staff && window.location.pathname === '/dashboard') {
    return <Navigate to="/admin" replace />;
  }

  return <Layout>{children}</Layout>;
});

// Main App component
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BackgroundProvider>
          <AdminProvider>
            <ThemeProvider>
              <CssBaseline />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <BackgroundManager>
                  <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                      <Route path="/" element={<Login />} />
                      <Route path="/login" element={<Navigate to="/" replace />} />
                      
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
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/time-entries" element={
                        <ProtectedRoute>
                          <AdminTimeEntries />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/time-off" element={
                        <ProtectedRoute>
                          <AdminTimeOff />
                        </ProtectedRoute>
                      } />
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
