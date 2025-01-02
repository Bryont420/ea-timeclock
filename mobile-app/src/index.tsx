/**
 * @fileoverview Application entry point and root component initialization.
 * Sets up the React application with error boundaries, service worker,
 * and performance monitoring. Handles global error cases and analytics.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './utils/webVitals';
import { analytics } from './services/analytics';

// Initialize analytics
analytics.pageView(window.location.pathname);

/**
 * Global error boundary component.
 * Catches and handles runtime errors throughout the application.
 * Provides a user-friendly fallback UI and error reporting.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Updates state when an error occurs
   * @param error - The error that was caught
   */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  /**
   * Handles error reporting and logging
   * @param error - The error that occurred
   * @param errorInfo - Additional error information from React
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to your preferred error tracking service
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1>Something went wrong</h1>
          <p>We're working on fixing the issue. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              marginTop: '20px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Create root with error handling
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element');
}

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // When a new version is available, notify the user
    const updateNotification = document.createElement('div');
    updateNotification.className = 'update-notification';
    updateNotification.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: #2196F3;
      color: white;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 10000;
    `;
    updateNotification.innerHTML = `
      <p style="margin: 0 0 8px 0">A new version is available!</p>
      <button onclick="window.location.reload()" 
              style="background: white; color: #2196F3; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer">
        Update Now
      </button>
    `;
    document.body.appendChild(updateNotification);

    // Activate the new service worker when user clicks update
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
});

const root = ReactDOM.createRoot(container);

// Render app with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Report web vitals
reportWebVitals();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
