/* PitStop Manager - service worker
   Stratégie : "réseau d'abord" pour la page (toujours la dernière version en
   ligne quand il y a du réseau), "cache d'abord" pour les icônes et les polices
   (rapidité + hors-ligne). Repli complet sur le cache quand hors-ligne. */
const CACHE = 'pitstop-1.5';

const ASSETS = [
  './',
  './index.html',
  './pitstop-manager-app.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  /* Page de l'app : réseau d'abord, cache en secours (hors-ligne) */
  const isAppDoc = e.request.mode === 'navigate' || (sameOrigin && /\.html?$/.test(url.pathname));
  if (isAppDoc) {
    e.respondWith(
      fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() =>
        caches.match(e.request).then((c) => c || caches.match('./pitstop-manager-app.html'))
      )
    );
    return;
  }

  /* Polices Google : cache d'abord, puis réseau (et mise en cache pour le hors-ligne) */
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((hit) =>
          hit || fetch(e.request).then((resp) => { cache.put(e.request, resp.clone()).catch(() => {}); return resp; })
        )
      ).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Reste (icônes, manifeste) : cache d'abord */
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((resp) => {
      if (sameOrigin) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
      return resp;
    })).catch(() => caches.match('./pitstop-manager-app.html'))
  );
});
