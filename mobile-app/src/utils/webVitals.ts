import { onCLS, onFID, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { analytics } from '../services/analytics';

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
  if (value <= 3400) return 'good';
  if (value <= 5800) return 'needs-improvement';
  return 'poor';
};

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

const reportWebVitals = () => {
  onFCP((metric) => sendToAnalytics(metric));
  onLCP((metric) => sendToAnalytics(metric));
  onFID((metric) => sendToAnalytics(metric));
  onCLS((metric) => sendToAnalytics(metric));
  onTTFB((metric) => sendToAnalytics(metric));
};

export default reportWebVitals;
