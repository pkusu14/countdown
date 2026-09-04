/* Offline support.
 *
 * Two caches on purpose: the app shell, which is small and always kept fresh,
 * and memes, which are big and only fetched as they come up. Downloading the
 * whole meme folder onto his phone up front would be rude. */

const VERSION = 'v1';
const SHELL_CACHE = `us-shell-${VERSION}`;
const MEME_CACHE = `us-memes-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'jokes.js',
  'memes.js',
  'manifest.webmanifest',
  'assets/icons/icon-180.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // one missing file shouldn't fail the whole install, so add them individually
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

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

  // page loads: try the network so a new deploy lands immediately, fall back to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  // everything else: serve the cached copy instantly, refresh it in the background
  event.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    )
  );
});
