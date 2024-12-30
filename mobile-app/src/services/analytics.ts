const GA_ID = 'G-TRXWSEHPKL';
const GA_ENDPOINT = 'https://www.google-analytics.com/g/collect';
const BATCH_INTERVAL = 2000; // 2 seconds
const MAX_BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface AnalyticsEvent {
  name: string;
  params?: Record<string, string | number | boolean>;
}

interface QueuedEvent {
  data: Record<string, any>;
  retries: number;
  timestamp: number;
}

class Analytics {
  private clientId: string;
  private sessionId: string;
  private eventQueue: QueuedEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private offlineQueue: QueuedEvent[] = [];

  constructor() {
    this.clientId = this.getClientId();
    this.sessionId = this.getSessionId();
    this.setupOfflineHandling();
  }

  private getClientId(): string {
    let clientId = localStorage.getItem('_ga_clientId');
    if (!clientId) {
      clientId = Math.random().toString(36).substring(2) + '.' + Date.now();
      localStorage.setItem('_ga_clientId', clientId);
    }
    return clientId;
  }

  private getSessionId(): string {
    const now = Date.now();
    let sessionId = sessionStorage.getItem('_ga_sessionId');
    let sessionStart = sessionStorage.getItem('_ga_sessionStart');
    
    // Session expires after 30 minutes of inactivity
    if (!sessionId || !sessionStart || now - parseInt(sessionStart) > 30 * 60 * 1000) {
      sessionId = now.toString();
      sessionStorage.setItem('_ga_sessionId', sessionId);
      sessionStorage.setItem('_ga_sessionStart', now.toString());
    }
    
    return sessionId;
  }

  private updateSession() {
    sessionStorage.setItem('_ga_sessionStart', Date.now().toString());
  }

  private setupOfflineHandling() {
    // Load saved offline events
    const savedEvents = localStorage.getItem('_ga_offline_events');
    if (savedEvents) {
      try {
        this.offlineQueue = JSON.parse(savedEvents);
      } catch (e) {
        console.debug('Failed to parse offline events');
      }
    }

    // Handle online/offline events
    window.addEventListener('online', () => this.processOfflineQueue());
    window.addEventListener('offline', () => {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
    });
  }

  private async sendBeacon(events: QueuedEvent[]) {
    if (!navigator.onLine) {
      this.offlineQueue.push(...events);
      localStorage.setItem('_ga_offline_events', JSON.stringify(this.offlineQueue));
      return;
    }

    try {
      const promises = events.map(event => {
        // Update session timestamp
        this.updateSession();

        const params = new URLSearchParams({
          v: '2',
          tid: GA_ID,
          cid: this.clientId,           // Client ID
          _s: '1',                     // Hit sequence
          seg: '1',                    // Session engagement
          sid: this.sessionId,         // Session ID
          sct: '1',                    // Session count
          dl: window.location.href,    // Document location
          dt: document.title,          // Document title
          ul: navigator.language,      // User language
          sr: `${window.screen.width}x${window.screen.height}`, // Screen resolution
          ...event.data
        });

        // Add _z parameter to prevent caching
        params.append('_z', Date.now().toString());

        return fetch(`${GA_ENDPOINT}?${params.toString()}`, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true
        });
      });

      await Promise.all(promises);
    } catch (error) {
      console.debug('Analytics send failed:', error);
      // Add failed events back to queue with increased retry count
      events.forEach(event => {
        if (event.retries < MAX_RETRIES) {
          this.queueEvent({
            ...event,
            retries: event.retries + 1,
          });
        }
      });
    }
  }

  private queueEvent(event: QueuedEvent) {
    this.eventQueue.push(event);
    
    // Start batch timer if not already running
    if (!this.batchTimeout && navigator.onLine) {
      this.batchTimeout = setTimeout(() => this.processBatch(), BATCH_INTERVAL);
    }
  }

  private async processBatch() {
    this.batchTimeout = null;
    
    if (this.eventQueue.length === 0) return;

    // Take up to MAX_BATCH_SIZE events
    const batch = this.eventQueue.splice(0, MAX_BATCH_SIZE);
    await this.sendBeacon(batch);

    // If there are more events, schedule next batch
    if (this.eventQueue.length > 0 && navigator.onLine) {
      this.batchTimeout = setTimeout(() => this.processBatch(), BATCH_INTERVAL);
    }
  }

  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    const batch = this.offlineQueue.splice(0, MAX_BATCH_SIZE);
    await this.sendBeacon(batch);
    localStorage.setItem('_ga_offline_events', JSON.stringify(this.offlineQueue));

    // Process remaining offline events
    if (this.offlineQueue.length > 0) {
      setTimeout(() => this.processOfflineQueue(), RETRY_DELAY);
    }
  }

  pageView(path: string) {
    this.queueEvent({
      data: {
        en: 'page_view',  // GA4 uses 'en' for event name
        ep: path,         // GA4 uses 'ep' for event parameters
        dt: document.title,
      },
      retries: 0,
      timestamp: Date.now(),
    });
  }

  event({ name, params = {} }: AnalyticsEvent) {
    this.queueEvent({
      data: {
        en: name,  // GA4 uses 'en' for event name
        ...Object.entries(params).reduce((acc, [key, value]) => ({
          ...acc,
          [`ep.${key}`]: value,  // GA4 uses 'ep.' prefix for event parameters
        }), {}),
      },
      retries: 0,
      timestamp: Date.now(),
    });
  }
}

export const analytics = new Analytics();