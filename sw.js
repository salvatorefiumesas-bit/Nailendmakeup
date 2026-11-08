/* Service worker – Nails & Makeup
   Strategia: rete per prima (così index.html è sempre l'ultima versione),
   cache solo come riserva se manca la connessione.
   Per forzare un aggiornamento in futuro basta cambiare VERSIONE. */
const VERSIONE = 'nm-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== VERSIONE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Solo file del proprio sito: Firebase, Google, font ecc. passano diretti
  if (u.origin !== self.location.origin) return;

  e.respondWith(
    fetch(r, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(VERSIONE).then(c => c.put(r, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(r).then(x => x || caches.match('./index.html')))
  );
});
