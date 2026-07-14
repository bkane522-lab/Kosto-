// sw.js — Kosto : nettoyage total du cache.
// Ce service worker efface tous les anciens caches, se désinscrit,
// et recharge la page automatiquement. Plus rien ne reste bloqué.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
