/* Service worker — punon edhe pa internet (cache-first).
 * Gjithçka (përfshirë fontet) është e ngjitur në aplikacion, pa CDN. */
const CACHE = "fjale-shqip-v5";
const ASSETS = [
  "index.html",
  "privacy.html",
  "css/fonts.css",
  "css/style.css",
  "fonts/nunito-latin-700-normal.woff2",
  "fonts/nunito-latin-800-normal.woff2",
  "fonts/nunito-latin-900-normal.woff2",
  "js/config.js",
  "js/native.js",
  "js/levels.js",
  "js/levels-gen.js",
  "js/crossword.js",
  "js/ads.js",
  "js/game.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
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
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
