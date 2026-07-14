// sw.js — Kosto : cache du shell pour l'installation PWA
// Change CACHE (v2 → v3 → …) à chaque mise à jour pour forcer le rafraîchissement.
const CACHE = "kosto-v3";
const SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Jamais de cache pour l'API (résultats dynamiques)
  if (url.pathname.startsWith("/api/")) return;
  // index.html : réseau d'abord (pour voir les mises à jour), cache en secours
  if (e.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname === "/") {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then(h => h || caches.match("./index.html"))));
    return;
  }
  // reste : cache d'abord
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
