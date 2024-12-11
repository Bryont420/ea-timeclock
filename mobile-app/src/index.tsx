import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

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

// Register service worker with improved error handling
serviceWorkerRegistration.register({
  onUpdate: (registration: ServiceWorkerRegistration) => {
    const waitingServiceWorker = registration.waiting;
    if (waitingServiceWorker) {
      // Show update notification
      const shouldUpdate = window.confirm(
        'A new version is available! Would you like to update?'
      );
      if (!shouldUpdate) return;

      waitingServiceWorker.addEventListener('statechange', (event: Event) => {
        if ((event.target as ServiceWorker).state === 'activated') {
          window.location.reload();
        }
      });
      waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
    }
  },
  onSuccess: (registration: ServiceWorkerRegistration) => {
    console.log('Service Worker registration successful');
  },
  onError: (error: Error) => {
    console.error('Service Worker registration failed:', error);
  }
});

// Monitor performance metrics
reportWebVitals(sendToAnalytics);
