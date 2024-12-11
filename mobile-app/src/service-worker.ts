/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { 
  StaleWhileRevalidate, 
  CacheFirst, 
  NetworkFirst,
  NetworkOnly
} from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Claim control immediately
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Filter manifest to only precache essential files
const manifest = self.__WB_MANIFEST.filter((entry: any) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  
  // Only precache essential files
  return (
    url.endsWith('index.html') ||
    url.endsWith('main.js') ||
    url.endsWith('mui.js') ||
    url.endsWith('.css') ||
    url.includes('login.chunk.js') || // Include login page for offline access
    url.includes('static/media/') // Include static assets
  );
});

// Precache essential assets
precacheAndRoute(manifest);

// Cache configuration
const CACHE_CONFIGS = {
  documents: {
    cacheName: 'documents-cache',
    maxEntries: 50,
    maxAgeSeconds: 24 * 60 * 60 // 24 hours
  },
  images: {
    cacheName: 'images-cache',
    maxEntries: 60,
    maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
  },
  api: {
    cacheName: 'api-cache',
    maxEntries: 100,
    maxAgeSeconds: 5 * 60 // 5 minutes
  }
};

// API endpoints that should never be cached or intercepted
const UNCACHEABLE_API_ENDPOINTS = [
  '/api/login',
  '/api/logout',
  '/api/token/refresh',
  '/api/employee/clock',
  '/api/admin/employees', 
  '/api/user/preferences'  
];

// App shell routing
const navigationRoute = new NavigationRoute(
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html'),
  {
    allowlist: [new RegExp('^/(?!api)')],
    denylist: [
      new RegExp('^/_'),
      new RegExp('/[^/?]+\\.[^/]+$'),
      new RegExp('^/api/'), // Exclude API routes from navigation handling
    ],
  }
);
registerRoute(navigationRoute);

// Handle uncacheable endpoints first with NetworkOnly
registerRoute(
  ({ url }) => {
    return UNCACHEABLE_API_ENDPOINTS.some(endpoint => 
      url.pathname.startsWith(endpoint) || 
      // Also match any endpoints under admin/
      (url.pathname.startsWith('/api/admin/'))
    );
  },
  new NetworkOnly()
);

// API routes - only cache static GET requests
registerRoute(
  ({ url, request }) => {
    // Only handle API routes
    if (!url.pathname.startsWith('/api')) return false;
    
    // Only handle GET requests
    if (request.method !== 'GET') return false;
    
    // Don't handle uncacheable endpoints or admin routes
    if (UNCACHEABLE_API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint)) ||
        url.pathname.includes('/api/admin/')) {
      return false;
    }
    
    return true;
  },
  new NetworkFirst({
    cacheName: CACHE_CONFIGS.api.cacheName,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200]
      }),
      new ExpirationPlugin({
        maxEntries: CACHE_CONFIGS.api.maxEntries,
        maxAgeSeconds: CACHE_CONFIGS.api.maxAgeSeconds
      })
    ]
  })
);

// Cache static assets (JS/CSS) with a stale-while-revalidate strategy
registerRoute(
  ({ request, url }) => {
    // Handle main bundles
    if (url.pathname.includes('main.') || url.pathname.includes('mui.')) {
      return request.destination === 'script';
    }
    
    // Handle lazy-loaded chunks
    if (url.pathname.includes('.chunk.js')) {
      return request.destination === 'script';
    }
    
    // Handle styles
    return request.destination === 'style';
  },
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200]
      })
    ]
  })
);

// Cache images with a cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_CONFIGS.images.cacheName,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200]
      }),
      new ExpirationPlugin({
        maxEntries: CACHE_CONFIGS.images.maxEntries,
        maxAgeSeconds: CACHE_CONFIGS.images.maxAgeSeconds
      })
    ]
  })
);

// Define periodic sync event interface
interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

// Add periodic sync to service worker event map
declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    'periodicsync': PeriodicSyncEvent;
  }
}

// Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Periodic cache cleanup
self.addEventListener('periodicsync', (event: PeriodicSyncEvent) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            return caches.open(cacheName).then(cache => {
              return cache.keys().then(requests => {
                return Promise.all(
                  requests.map(request => {
                    return cache.delete(request);
                  })
                );
              });
            });
          })
        );
      })
    );
  }
});
