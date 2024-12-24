import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import type { WebVitalsGtagData } from '../types/gtag';

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

const getRating = (value: number): 'good' | 'needs-improvement' | 'poor' => {
  // Speed Index thresholds (in ms) based on Google's recommendations
  if (value <= 3400) return 'good';
  if (value <= 5800) return 'needs-improvement';
  return 'poor';
};

const sendToGoogleAnalytics = (metric: Metric) => {
  const deviceType = getDeviceType();
  const eventData: WebVitalsGtagData = {
    event_category: 'Web Vitals',
    value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    metric_id: metric.id,
    non_interaction: true,
    dimension1: deviceType,
    dimension2: `${window.innerWidth}x${window.innerHeight}`
  };
  
  // Log to console for debugging
  console.log(`[Web Vitals] ${metric.name}:`, {
    value: metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value),
    delta: metric.name === 'CLS' ? metric.delta.toFixed(3) : Math.round(metric.delta),
    deviceType,
    viewport: eventData.dimension2,
    rating: metric.rating
  });

  window.gtag('event', metric.name, eventData);
};

const reportWebVitals = () => {
  // First Contentful Paint
  onFCP((metric) => {
    console.log(' First Contentful Paint (FCP):', Math.round(metric.value), 'ms');
    sendToGoogleAnalytics(metric);
  });

  // Largest Contentful Paint
  onLCP((metric) => {
    console.log(' Largest Contentful Paint (LCP):', Math.round(metric.value), 'ms');
    sendToGoogleAnalytics(metric);
  });

  // First Input Delay
  onFID((metric) => {
    console.log(' First Input Delay (FID):', Math.round(metric.value), 'ms');
    sendToGoogleAnalytics(metric);
  });

  // Cumulative Layout Shift
  onCLS((metric) => {
    console.log(' Cumulative Layout Shift (CLS):', metric.value.toFixed(3));
    sendToGoogleAnalytics(metric);
  });

  // Time to First Byte
  onTTFB((metric) => {
    console.log(' Time to First Byte (TTFB):', Math.round(metric.value), 'ms');
    sendToGoogleAnalytics(metric);
  });

  // Speed Index using PerformanceObserver
  if ('performance' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      const value = lastEntry.startTime;
      const rating = getRating(value);
      
      console.log(' Speed Index (SI):', Math.round(value), 'ms');
      
      // Send Speed Index to GA with custom type
      const siMetric = {
        name: 'SI',
        value: value,
        delta: value,
        id: 'speed-index-' + Date.now(),
        entries: [lastEntry],
        navigationType: 'navigate',
        rating: rating
      };
      
      // Type assertion since SI is not a standard web-vital
      sendToGoogleAnalytics(siMetric as unknown as Metric);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }
};

export default reportWebVitals;
