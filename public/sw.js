// Service Worker for oppSpot PWA
const CACHE_NAME = 'oppspot-v1.0.0';
const RUNTIME_CACHE = 'oppspot-runtime';
const API_CACHE = 'oppspot-api';

// Critical assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/search',
  '/map',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/businesses/search',
  '/api/businesses/recent',
  '/api/notifications',
  '/api/user/profile'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Precaching assets');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => {
      console.log('Service Worker: Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME &&
                   cacheName !== RUNTIME_CACHE &&
                   cacheName !== API_CACHE;
          })
          .map((cacheName) => {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE)
    );
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstStrategy(request, CACHE_NAME).catch(() => {
        return caches.match('/offline');
      })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      cacheFirstStrategy(request, RUNTIME_CACHE)
    );
    return;
  }

  // Default to network-first
  event.respondWith(
    networkFirstStrategy(request, RUNTIME_CACHE)
  );
});

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
    }).catch(() => {});

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    throw error;
  }
}

// Network-first strategy
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'oppSpot Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { data } = event.notification;

  if (action === 'dismiss') {
    return;
  }

  // Open the app or navigate to specific page
  const urlToOpen = data.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('oppspot') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-saved-businesses') {
    event.waitUntil(syncSavedBusinesses());
  } else if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Sync saved businesses when back online
async function syncSavedBusinesses() {
  try {
    // Get pending saves from IndexedDB
    const db = await openDB();
    const tx = db.transaction('pending-saves', 'readonly');
    const saves = await tx.objectStore('pending-saves').getAll();

    // Send to server
    for (const save of saves) {
      await fetch('/api/businesses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(save)
      });
    }

    // Clear pending saves
    const clearTx = db.transaction('pending-saves', 'readwrite');
    await clearTx.objectStore('pending-saves').clear();
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync notifications when back online
async function syncNotifications() {
  try {
    const response = await fetch('/api/notifications?unread=true');
    if (response.ok) {
      const notifications = await response.json();
      // Update badge count
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(notifications.length);
      }
    }
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

// Simple IndexedDB wrapper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('oppspot-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-saves')) {
        db.createObjectStore('pending-saves', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}