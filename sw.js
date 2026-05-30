// Service worker — caches the app shell for offline play.
// Bump this version (and js/version.js) on every deploy so clients auto-update.
const CACHE = "lakehouse-cards-v121";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/ui.js",
  "./js/version.js",
  "./js/cam.js",
  "./js/meeting.js",
  "./js/deckgame.js",
  "./js/custom_cards_ui.js",
  "./js/catchphrase.js",
  "./js/cloud_sync.js",
  "./js/gartic.js",
  "./js/gallery.js",
  "./js/data.js",
  "./js/icons.js",
  "./js/games/dice_hub.js",
  "./js/games/quiplash.js",
  "./js/games/telestrations.js",
  "./js/games/scribblio.js",
  "./js/games/headsup.js",
  "./js/games/charades.js",
  "./js/games/farkle.js",
  "./js/games/yahtzee.js",
  "./js/games/liars_dice.js",
  "./js/games/picture_book.js",
  "./js/games/tv_host.js",
  "./js/games/blank_slate.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      const requests = ASSETS.map(asset => new Request(asset, { cache: "reload" }));
      return c.addAll(requests);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin successful responses for next time.
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
