import React, { lazy, Suspense, memo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { useAuth } from './contexts/AuthContext';
import { BackgroundProvider } from './contexts/BackgroundContext';
import { Layout } from './components/Layout';
import { BackgroundManager } from './components/BackgroundManager';

// Create theme context
const ColorModeContext = React.createContext({ 
  toggleColorMode: () => {} 
});

// App wrapper for theme
const AppWithTheme = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = React.useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#303030',
            paper: mode === 'light' ? '#fff' : '#424242',
          },
        },
        components: {
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
                '&.app-header, &.login-header, &.employee-header': {
                  backgroundColor: 'transparent'
                }
              },
              h1: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              h2: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              h3: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              h4: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              h5: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              h6: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              subtitle1: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
              subtitle2: {
                '&:not(.login-header):not(.app-header):not(.employee-header)': {
                  backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(48, 48, 48, 0.6)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                }
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <AuthProvider>
            <AdminProvider>
              <BackgroundProvider>
                <BrowserRouter>
                  <BackgroundManager>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Routes>
                        <Route path="/" element={<Login />} />
                        <Route path="/login" element={<Navigate to="/" replace />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/time-entries" element={<ProtectedRoute><TimeEntries /></ProtectedRoute>} />
                        <Route path="/time-off" element={<ProtectedRoute><TimeOff /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/admin/time-off" element={<ProtectedRoute><AdminTimeOff /></ProtectedRoute>} />
                        <Route path="/admin/time-entries" element={<ProtectedRoute><AdminTimeEntries /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </BackgroundManager>
                </BrowserRouter>
              </BackgroundProvider>
            </AdminProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

// Lazy load page components
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const TimeEntries = lazy(() => import('./pages/TimeEntries').then(module => ({ default: module.TimeEntries })));
const TimeOff = lazy(() => import('./pages/TimeOff').then(module => ({ default: module.TimeOff })));
const AdminTimeOff = lazy(() => import('./pages/AdminTimeOff').then(module => ({ default: module.AdminTimeOff })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminTimeEntries = lazy(() => import('./pages/AdminTimeEntries').then(module => ({ default: module.AdminTimeEntries })));

// Protected Route component with memoization
const ProtectedRoute = memo(({ children }: { children: React.ReactNode }) => {
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
const App = memo(() => {
  return (
    <AppWithTheme />
  );
});

export default App;
