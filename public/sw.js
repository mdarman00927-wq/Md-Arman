const CACHE_NAME = 'nextask-shell-v1';
const DYNAMIC_CACHE_NAME = 'nextask-dynamic-v1';

// App shell assets to cache instantly
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png'
];

// Helper to determine if a request should be ignored from PWA service worker caching
function shouldIgnore(url) {
  return (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('identitytoolkit') ||
    url.includes('accounts.google.com') ||
    url.includes('chrome-extension://') ||
    url.includes('maps.googleapis.com')
  );
}

// 1. Install Event: Cache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache registry:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Stale-While-Revalidate and/or Network-First caching strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;

  // Only handle GET requests and skip external/ignored APIs
  if (event.request.method !== 'GET' || shouldIgnore(requestUrl)) {
    return;
  }

  // Gracefully handle server-side AI API routes (/api/*) when offline
  if (requestUrl.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: true,
            status: 'offline',
            message: 'NexTask AI Assistant is currently offline. Please check your internet connection and try sync actions again.'
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Standard static assets & page fetches: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset instantly, but trigger background fetch to update the cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch for offline fetch failures - we serve cache
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync Support
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks' || event.tag === 'sync-notes') {
    console.log('[Service Worker] Triggering Background Synchronization for Tag:', event.tag);
    // Broadcast message to all window tabs to alert them to trigger synchronization procedures
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_TRIGGERED',
          tag: event.tag
        });
      });
    });
  }
});
