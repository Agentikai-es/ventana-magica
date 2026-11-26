// Service worker: la app se guarda en la tablet y abre aunque se pierda la conexión con la caja.
// Nunca guarda datos personales: las fotos, audios y la API van siempre a la caja.
const VERSION = 'vm-v5';
const BASE = [
  '/', '/ventana', '/enviar', '/aprobar', '/privacidad',
  '/estilos.css', '/comun.js', '/iconos.js', '/sonido.js', '/puzle.js', '/grabador.js',
  '/ventana.js', '/editor.js', '/jardin.js', '/flores.js', '/enviar.js', '/aprobar.js', '/inicio.js', '/manifest.webmanifest', '/icono.svg', '/icono-192.png', '/icono-512.png', '/icono-apple.png',
  '/lib/catalogo.js', '/lib/escenario.js', '/lib/escena.js', '/lib/narracion.js',
];
const NUNCA = /^\/(api|fotos|medios|video|t|panel|ca\.pem)(\/|$)/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || NUNCA.test(url.pathname)) return;
  // Primero la caja (siempre lo último); si no responde, la copia guardada.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
