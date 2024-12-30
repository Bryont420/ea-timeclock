const GA_ID = 'G-TRXWSEHPKL';
const GA_ENDPOINT = 'https://www.google-analytics.com/g/collect';

interface AnalyticsEvent {
  name: string;
  params?: Record<string, string | number | boolean>;
}

class Analytics {
  private clientId: string;

  constructor() {
    this.clientId = this.getClientId();
  }

  private getClientId(): string {
    let clientId = localStorage.getItem('_ga_clientId');
    if (!clientId) {
      clientId = Math.random().toString(36).substring(2) + '.' + Date.now();
      localStorage.setItem('_ga_clientId', clientId);
    }
    return clientId;
  }

  private async sendBeacon(data: Record<string, any>) {
    const params = new URLSearchParams({
      v: '2',
      tid: GA_ID,
      cid: this.clientId,
      ...data,
    });

    // Use sendBeacon if available, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${GA_ENDPOINT}?${params.toString()}`);
    } else {
      try {
        await fetch(`${GA_ENDPOINT}?${params.toString()}`, {
          method: 'POST',
          keepalive: true,
        });
      } catch (error) {
        console.debug('Analytics send failed:', error);
      }
    }
  }

  pageView(path: string) {
    this.sendBeacon({
      t: 'pageview',
      dp: path,
      dt: document.title,
    });
  }

  event({ name, params = {} }: AnalyticsEvent) {
    this.sendBeacon({
      t: 'event',
      en: name,
      ...Object.entries(params).reduce((acc, [key, value]) => ({
        ...acc,
        [`ep.${key}`]: value,
      }), {}),
    });
  }
}

export const analytics = new Analytics();
