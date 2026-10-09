const CACHE_NAME = 'sport-tracker-ab-v86';
const ASSETS = ['./','./index.html','./styles.css','./programme.js','./quotes.js','./app.js','./exercises-db.js','./manifest.json','./supabase-config.js','./vendor/supabase.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.all(ASSETS.map(a => cache.add(a).catch(() => null))))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k.startsWith('sport-tracker-ab-')).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const appFile = sameOrigin && (req.mode === 'navigate' || /\.(html|js|css|json)$/i.test(url.pathname) || url.pathname.endsWith('/'));
  if (appFile) {
    // Réseau d'abord : la nouvelle version s'affiche dès le premier lancement ; cache si hors-ligne
    event.respondWith(fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {}); } return res; }).catch(() => caches.match(req).then(c => c || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
