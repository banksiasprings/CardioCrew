const CACHE = 'cardio-crew-v5';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/CardioCrew/',
      '/CardioCrew/index.html',
      '/CardioCrew/manifest.json',
      '/CardioCrew/icons/icon-192.png',
      '/CardioCrew/icons/icon-512.png'
    ]))
  );
  self.skipWaiting(); // activate immediately, don't wait for old tabs to close
});

self.addEventListener('activate', e => {
  // Delete old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always pass Firebase / Google API requests straight to the network
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for HTML (always get latest app shell)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/CardioCrew/') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, etc.)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
