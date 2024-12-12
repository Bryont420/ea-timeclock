import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

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

// Performance monitoring function
const sendToAnalytics = (metric: any) => {
  // Replace with your analytics service
  if (process.env.NODE_ENV === 'production') {
    console.log('Performance Metric:', metric);
    // Example: Send to analytics service
    // analytics.send(metric);
  }
};

// Create root with error handling
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find root element');
}

const root = ReactDOM.createRoot(container);

// Render app with error boundary
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Monitor performance metrics
reportWebVitals(sendToAnalytics);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // When there's an update, show the update notification
    const updateNotification = document.createElement('div');
    updateNotification.className = 'update-notification';
    updateNotification.innerHTML = `
      <p>A new version of the app is available!</p>
      <button onclick="window.location.reload()">Update Now</button>
    `;
    document.body.appendChild(updateNotification);
  }
});
