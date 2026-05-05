const CACHE_NAME = 'krishna-says-v2';
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
  './manifest.json'
];

// Install: cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Force the new SW to activate immediately, bypassing waiting
  self.skipWaiting();
});

// Activate: purge stale caches from old SW versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
