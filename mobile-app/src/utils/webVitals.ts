/**
 * @fileoverview Web Vitals tracking and reporting utilities.
 * Implements Core Web Vitals tracking using the web-vitals library
 * and reports metrics to analytics service. Tracks FCP, LCP, FID,
 * CLS, and TTFB metrics across different device types.
 */

import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { analytics } from '../services/analytics';

/**
 * Determines the device type based on user agent string.
 * Categories:
 * - tablet: iPad, Android tablets, etc.
 * - mobile: smartphones and small devices
 * - desktop: all other devices
 * 
 * @returns Device type classification
 */
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

/**
 * Determines performance rating based on metric value.
 * Thresholds based on Core Web Vitals recommendations:
 * - good: <= 3400ms
 * - needs-improvement: <= 5800ms
 * - poor: > 5800ms
 * 
 * @param value - Metric value in milliseconds
 * @returns Performance rating classification
 */
const getRating = (value: number): 'good' | 'needs-improvement' | 'poor' => {
  if (value <= 3400) return 'good';
  if (value <= 5800) return 'needs-improvement';
  return 'poor';
};

/**
 * Sends Web Vitals metric to analytics service.
 * Processes and formats metrics before sending:
 * - Rounds values appropriately
 * - Adjusts CLS values (multiplies by 1000)
 * - Adds device and viewport information
 * - Includes performance rating
 * 
 * @param metric - Web Vitals metric object
 */
const sendToAnalytics = (metric: Metric) => {
  const deviceType = getDeviceType();
  const rating = metric.rating || getRating(metric.value);
  
  analytics.event({
    name: 'web_vitals',
    params: {
      metric_name: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      device_type: deviceType,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      rating,
      delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta)
    }
  });
  
  // Log to console for debugging
  console.log(`[Web Vitals] ${metric.name}:`, {
    value: metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value),
    delta: metric.name === 'CLS' ? metric.delta.toFixed(3) : Math.round(metric.delta),
    deviceType,
    rating
  });
};

/**
 * Initializes Web Vitals reporting.
 * Sets up listeners for all Core Web Vitals metrics:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 */
const reportWebVitals = () => {
  onFCP((metric) => sendToAnalytics(metric));
  onLCP((metric) => sendToAnalytics(metric));
  onFID((metric) => sendToAnalytics(metric));
  onCLS((metric) => sendToAnalytics(metric));
  onTTFB((metric) => sendToAnalytics(metric));
};

export default reportWebVitals;
