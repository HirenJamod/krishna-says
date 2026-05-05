const CACHE_NAME = 'krishna-says-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './js/uiAgent.js',
  './js/wisdomAgent.js',
  './js/authAgent.js',
  './js/profileAgent.js',
  './js/safetyAgent.js',
  './js/masterAgent.js',
  './js/contextAgent.js',
  './js/searchAgent.js',
  './js/otpAgent.js',
  './js/razorpayAgent.js',
  './js/firebaseConfig.js',
  './manifest.json',
  './assets/icons/icon-512.jpg',
  './assets/screenshots/mobile.jpg'
];

// Install: cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: purge stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first with network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ─── Background Sync (Offline Query Handling) ──────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queries') {
    console.log('[SW] Background Sync: Syncing pending queries...');
    // In a real app, you would pull from IndexedDB and send to /api/queries/log
  }
});

// ─── Periodic Sync (Daily Wisdom) ───────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-wisdom') {
    console.log('[SW] Periodic Sync: Fetching daily wisdom...');
    event.waitUntil(fetchDailyWisdom());
  }
});

async function fetchDailyWisdom() {
  try {
    const response = await fetch('/api/wisdom/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Give me a daily thought', depth: 'practical' })
    });
    const data = await response.json();
    // Use the Notification API to show the wisdom
    if (self.registration.showNotification) {
      self.registration.showNotification('Daily Wisdom from Krishna', {
        body: data.response,
        icon: './assets/icons/icon-192.png'
      });
    }
  } catch (err) {
    console.error('[SW] Periodic fetch failed:', err);
  }
}

// ─── Push Notifications ──────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Krishna Says', body: 'Wisdom is calling...' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './assets/icons/icon-192.png'
    })
  );
});
