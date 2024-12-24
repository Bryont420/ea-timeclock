import { Gtag } from 'gtag.js';

export interface WebVitalsGtagData extends Gtag.CustomParams {
  event_category: string;
  value: number;
  metric_id: string;
  non_interaction: boolean;
  dimension1: 'mobile' | 'tablet' | 'desktop';
  dimension2: string;
}

declare global {
  interface Window {
    gtag: Gtag;
    dataLayer: any[];
    performance?: Performance;
  }
}
