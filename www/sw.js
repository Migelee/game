/* Service worker — punon edhe pa internet (cache-first),
 * me ruajtje dinamike të fonteve të Google. */
const CACHE = "fjale-shqip-v4";
const ASSETS = [
  "index.html",
  "privacy.html",
  "css/style.css",
  "js/levels.js",
  "js/levels-gen.js",
  "js/crossword.js",
  "js/ads.js",
  "js/game.js",
  "icons/icon.svg",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  // fontet e Google: ruaji në cache kur vijnë, që të punojnë offline
  if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request)
          .then((res) => { c.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
