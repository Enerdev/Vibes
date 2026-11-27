// Service worker: la app abre aunque no haya señal (modo offline básico).
const VERSION = 'vibes-v6';
const APP = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'img/icon.svg',
  'js/app.js', 'js/geo.js', 'js/red.js', 'js/envivo.js', 'js/planificador.js', 'js/reportes.js', 'js/lago.js', 'js/registro.js', 'js/grafo.js', 'js/osm.js',
  'data/puno.js', 'data/osm-puno.js', 'data/region.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== 'vibes-tiles').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Teselas del mapa: guardar las que ya se vieron para usarlas sin señal
  if (url.hostname === 'server.arcgisonline.com' || url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open('vibes-tiles').then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }

  // Clima y rutas por calles: siempre de la red
  if (url.hostname.includes('open-meteo') || url.hostname.includes('osrm')) return;

  // Archivos de la app: red primero, caché si no hay conexión
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && (url.origin === location.origin || url.hostname === 'unpkg.com')) {
          const copia = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request)),
  );
});
