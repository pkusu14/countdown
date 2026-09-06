/* Offline support.
 *
 * Two caches on purpose: the app shell, which is small and always kept fresh,
 * and memes, which are big and only fetched as they come up. Downloading the
 * whole meme folder onto his phone up front would be rude. */

const VERSION = 'v11';
const SHELL_CACHE = `us-shell-${VERSION}`;
const MEME_CACHE = `us-memes-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'jokes.js',
  'memes.js',
  'measures.js',
  'statuses.js',
  'feelings.js',
  'sync.js',
  'push.js',
  'firebase-config.js',
  'push-config.js',
  'manifest.webmanifest',
  'assets/icons/icon-180.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

// Firebase loads from Google's CDN. Cached so a no-signal launch doesn't sit
// waiting on it; the app works without it either way.
const VENDOR = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // one missing file shouldn't fail the whole install, so add them individually
      .then((cache) => Promise.all(
        SHELL.concat(VENDOR).map((url) => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== MEME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* The page tells us which memes are worth keeping offline - today's and
   tomorrow's - so they're already there when there's no signal. */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'warm' || !Array.isArray(data.urls)) return;

  event.waitUntil(
    caches.open(MEME_CACHE).then((cache) => Promise.all(
      data.urls.map((url) => cache.match(url).then((hit) => hit || cache.add(url).catch(() => {})))
    ))
  );
});

/* An incoming notification. iOS revokes the subscription of any app that
   receives a push and doesn't show something, so every path here ends in a
   visible notification - even a malformed one. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || 'us.';
  const options = {
    body: data.message || '',
    tag: data.tag || 'us',
    // feelings should stack up; status and list updates replace each other
    renotify: data.tag === 'feeling',
    silent: !!data.silent,
    icon: 'assets/icons/icon-192.png',
    badge: 'assets/icons/icon-192.png',
    data: { at: Date.now() }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus();
        }
        return self.clients.openWindow('./');
      })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase's own traffic must never be intercepted - it long-polls and
  // websockets, and a cached reply would break sync outright.
  if (url.origin !== location.origin) {
    if (VENDOR.indexOf(url.href) !== -1) {
      event.respondWith(
        caches.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }))
      );
    }
    return;
  }

  // memes never change once they have a name, so cache-first is safe and fast
  if (url.pathname.includes('/assets/memes/')) {
    event.respondWith(
      caches.open(MEME_CACHE).then((cache) =>
        cache.match(req).then((hit) => hit || fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // The whole app shell goes network-first, HTML and scripts alike.
  //
  // Serving a stale script alongside fresh HTML is the worst possible outcome:
  // buttons render but nothing responds to them. The shell is only a few KB, so
  // always asking the network is cheap, and the cache still covers being offline.
  // 'no-cache' forces a revalidation so GitHub Pages can't serve a stale copy
  // out of the browser's own HTTP cache either.
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          const key = req.mode === 'navigate' ? 'index.html' : req;
          caches.open(SHELL_CACHE).then((cache) => cache.put(key, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req.mode === 'navigate' ? 'index.html' : req)
          .then((hit) => hit || caches.match('./'))
      )
  );
});
