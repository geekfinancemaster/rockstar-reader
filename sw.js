// Service worker: offline support for Rockstar Reader
const VERSION = 'rockstar-v2';
const CORE = [
  './', 'index.html', 'manifest.json',
  'css/style.css', 'js/app.js', 'js/intro.js', 'js/config.js',
  'assets/ghost-rider-fire.jpg', 'assets/ghost-rider-cold.jpg', 'assets/favicon.svg',
  'lib/pdfjs/pdf.min.mjs', 'lib/pdfjs/pdf.worker.min.mjs',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function put(req, res) {
  try {
    if (res && res.ok && res.status === 200) {
      const c = await caches.open(VERSION);
      await c.put(req, res.clone());
    }
  } catch (_) { /* storage full or unsupported */ }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.toLowerCase().endsWith('.pdf')) {
    e.respondWith(
      fetch(req).then((res) => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => put(req, res)).catch(() => null);
      if (hit) return hit;
      return net.then((res) => res || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
