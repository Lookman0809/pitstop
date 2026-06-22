/* PitStop Manager - service worker (cache hors-ligne) */
const CACHE = 'pitstop-1.4.2';

/* Fichiers locaux préchargés à l'installation */
const ASSETS = [
  './',
  './pitstop-manager-app.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

/* Hôtes des polices Google (mises en cache à la volée, dès le 1er chargement en ligne) */
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* Polices : cache d'abord, sinon réseau puis mise en cache (pour le hors-ligne suivant) */
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((hit) =>
          hit || fetch(e.request).then((resp) => {
            cache.put(e.request, resp.clone()).catch(() => {});
            return resp;
          })
        )
      ).catch(() => caches.match(e.request))
    );
    return;
  }

  /* Reste : cache d'abord, sinon réseau ; repli sur la page pour une navigation hors-ligne */
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)).catch(() => {
      if (e.request.mode === 'navigation') return caches.match('./pitstop-manager-app.html');
      return Response.error();
    })
  );
});
