// Cache sencillo: la app funciona sin internet. Red primero para el HTML, cache primero para lo demás.
const CACHE = 'finito-v2';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest']))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // version.json siempre de la red: así la app sabe si hay una versión nueva
  if (url.pathname.endsWith('/version.json')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put('./', r.clone())); return r; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); } return r; })));
});
