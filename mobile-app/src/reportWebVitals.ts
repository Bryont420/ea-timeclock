/**
 * @fileoverview Web Vitals reporting implementation
 * Collects and reports Core Web Vitals metrics for performance monitoring
 * 
 * Metrics reported:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - FID (First Input Delay)
 * - TTFB (Time to First Byte)
 */

import { ReportHandler } from 'web-vitals';

/**
 * Reports Web Vitals metrics to the provided callback function
 * @param onPerfEntry - Callback function to handle the performance metrics
 * Each metric includes:
 * - name: The name of the metric
 * - delta: The current value of the metric
 * - id: Unique identifier for the metric
 * - entries: Performance entries used to calculate the metric
 */
const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);  // Cumulative Layout Shift
      getFID(onPerfEntry);  // First Input Delay
      getFCP(onPerfEntry);  // First Contentful Paint
      getLCP(onPerfEntry);  // Largest Contentful Paint
      getTTFB(onPerfEntry); // Time to First Byte
    });
  }
};

export default reportWebVitals;
