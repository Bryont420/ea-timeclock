/**
 * @fileoverview Analytics service for tracking user interactions and events.
 * Implements Google Analytics 4 (GA4) measurement protocol with offline support,
 * batching, and automatic retry mechanisms.
 */

/** Google Analytics 4 Measurement ID */
const GA_ID = 'G-TRXWSEHPKL';
/** Google Analytics 4 Collection Endpoint */
const GA_ENDPOINT = 'https://www.google-analytics.com/g/collect';
/** Interval between batch sends (in milliseconds) */
const BATCH_INTERVAL = 2000; // 2 seconds
/** Maximum number of events to send in a single batch */
const MAX_BATCH_SIZE = 10;
/** Maximum number of retry attempts for failed events */
const MAX_RETRIES = 3;
/** Delay between retry attempts (in milliseconds) */
const RETRY_DELAY = 1000; // 1 second

/**
 * Interface for analytics event data
 */
interface AnalyticsEvent {
    name: string;
    params?: Record<string, string | number | boolean>;
}

/**
 * Interface for queued events with retry tracking
 */
interface QueuedEvent {
    data: Record<string, any>;
    retries: number;
    timestamp: number;
}

/**
 * Analytics class that handles event tracking and reporting.
 * Features:
 * - Client and session ID management
 * - Event batching for performance
 * - Offline event queueing
 * - Automatic retry for failed events
 * - Debug mode for development
 */
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

    /**
     * Gets or generates a persistent client ID.
     * @returns Client ID string
     */
    private getClientId(): string {
        let clientId = localStorage.getItem('_ga_clientId');
        if (!clientId) {
            clientId = Math.random().toString(36).substring(2) + '.' + Date.now();
            localStorage.setItem('_ga_clientId', clientId);
        }
        return clientId;
    }

    /**
     * Gets or generates a session ID.
     * Session expires after 30 minutes of inactivity.
     * @returns Session ID string
     */
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

    /**
     * Updates the session start timestamp.
     */
    private updateSession() {
        sessionStorage.setItem('_ga_sessionStart', Date.now().toString());
    }

    /**
     * Sets up offline event handling.
     * Loads saved offline events and sets up event listeners for online/offline events.
     */
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

    /**
     * Sends a batch of events to Google Analytics.
     * @param events Batch of events to send
     */
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
                    _fv: 'j115',  // SDK version
                    _s: '1',      // Hit sequence
                    _ss: '1',     // Session start
                    _nsi: '1',    // New session id
                    cid: this.clientId,
                    uid: this.clientId,
                    sid: this.sessionId,
                    sct: '1',     // Session count
                    seg: '1',     // Session engagement
                    dl: window.location.href,
                    dr: document.referrer,
                    dt: document.title,
                    ul: navigator.language,
                    sr: `${window.screen.width}x${window.screen.height}`,
                    ...event.data
                });

                // Add current timestamp
                params.append('_et', Date.now().toString());

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

    /**
     * Adds an event to the event queue.
     * @param event Event to add
     */
    private queueEvent(event: QueuedEvent) {
        this.eventQueue.push(event);
        
        // Start batch timer if not already running
        if (!this.batchTimeout && navigator.onLine) {
            this.batchTimeout = setTimeout(() => this.processBatch(), BATCH_INTERVAL);
        }
    }

    /**
     * Processes the event queue and sends events in batches.
     */
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

    /**
     * Processes the offline event queue.
     */
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

    /**
     * Tracks a page view event.
     * @param path Page path
     */
    pageView(path: string) {
        this.queueEvent({
            data: {
                en: 'page_view',
                ep: {
                    page_location: window.location.href,
                    page_title: document.title,
                    page_path: path
                },
            },
            retries: 0,
            timestamp: Date.now(),
        });
    }

    /**
     * Tracks a custom event.
     * @param event Event data
     */
    event({ name, params = {} }: AnalyticsEvent) {
        this.queueEvent({
            data: {
                en: name,
                ep: params,  // GA4 expects parameters in ep object
            },
            retries: 0,
            timestamp: Date.now(),
        });
    }
}

export const analytics = new Analytics();