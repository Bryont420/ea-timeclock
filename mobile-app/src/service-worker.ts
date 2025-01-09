/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// These will be replaced by webpack during build
declare const BUILD_VERSION: string;
declare const BUILD_TIMESTAMP: string;

// Current version of the service worker - automatically updated by build
const CACHE_VERSION = `${BUILD_VERSION}-${BUILD_TIMESTAMP}`;

// Handle install and updates
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Check current version in cache
        const cache = await caches.open('sw-version');
        const cachedVersion = await cache.match('version');
        const currentVersion = cachedVersion ? await cachedVersion.text() : null;

        if (currentVersion && currentVersion !== CACHE_VERSION) {
          // Version changed - trigger update
          console.log(`Service Worker updating from ${currentVersion} to ${CACHE_VERSION}`);
          await self.skipWaiting();
        } else if (!currentVersion) {
          // First install - cache version
          await cache.put('version', new Response(CACHE_VERSION));
        }

        // Pre-cache offline page
        const offlineCache = await caches.open('offline-fallback');
        await offlineCache.add('/index.html');
      } catch (error) {
        console.error('Service Worker install error:', error);
      }
    })()
  );
});

// Handle activation and cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Check if version changed
        const cache = await caches.open('sw-version');
        const cachedVersion = await cache.match('version');
        const currentVersion = cachedVersion ? await cachedVersion.text() : null;

        if (currentVersion !== CACHE_VERSION) {
          // Version changed - update cache and claim clients
          console.log(`Service Worker activating new version ${CACHE_VERSION}`);
          
          // Clean up old caches
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter(key => !key.startsWith('workbox-') && key !== 'sw-version')
              .map(key => caches.delete(key))
          );

          // Update cached version
          await cache.put('version', new Response(CACHE_VERSION));

          // Only claim and reload if this isn't the first install
          if (currentVersion) {
            await self.clients.claim();
            // Notify clients to reload
            const clients = await self.clients.matchAll();
            clients.forEach(client => client.postMessage({ type: 'RELOAD_PAGE' }));
          }
        }
      } catch (error) {
        console.error('Service Worker activation error:', error);
      }
    })()
  );
});

// Precache all of the assets generated by your build process
precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell-style routing
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') {
      return false;
    }

    if (url.pathname.startsWith('/_')) {
      return false;
    }

    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }

    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache static assets
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
        maxEntries: 50 // Maximum number of assets to cache
      })
    ]
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 60 // Maximum number of images to cache
      })
    ]
  })
);

// Dynamic data routes - Network first with fallback
registerRoute(
  ({ url }) => 
    url.pathname.includes('/api/admin/') ||
    url.pathname.includes('/api/employee/') ||
    url.pathname.includes('/api/time-off-requests/') ||
    url.pathname.includes('/api/time-entries/'),
  new NetworkFirst({
    cacheName: 'dynamic-data',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
        maxEntries: 100
      })
    ]
  })
);

// User preferences - Network first with short cache
registerRoute(
  ({ url }) => 
    url.pathname.includes('/api/user/preferences/'),
  new NetworkFirst({
    cacheName: 'user-preferences',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60, // 1 minute
        maxEntries: 10
      })
    ]
  })
);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60 // 5 minutes
      })
    ]
  })
);

// Get the expected origin from the environment
const ALLOWED_ORIGIN = self.location.origin;

// Handle messages from clients with origin check
const handleClientMessage = (event: ExtendableMessageEvent) => {
  // Verify message origin
  if (!event.origin || event.origin !== ALLOWED_ORIGIN) {
    console.warn(`Rejected message from untrusted origin: ${event.origin}`);
    return;
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: BUILD_VERSION,
      timestamp: BUILD_TIMESTAMP,
      cacheVersion: CACHE_VERSION
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'LOGOUT') {
    // Clear user-specific caches
    caches.delete('user-preferences')
      .then(() => {
        console.log('User preferences cache cleared');
      })
      .catch((error) => {
        console.error('Error clearing user preferences cache:', error);
      });
  }
};

self.addEventListener('message', handleClientMessage);

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          return response;
        } catch (error) {
          const cache = await caches.open('offline-fallback');
          const cachedResponse = await cache.match('/index.html');
          return cachedResponse || new Response('Offline page not found', {
            status: 404,
            statusText: 'Not Found'
          });
        }
      })()
    );
  }
});
