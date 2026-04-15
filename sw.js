const STATIC_CACHE_NAME = "pocket-ledger-static";
const RUNTIME_CACHE_NAME = "pocket-ledger-runtime";
const APP_CACHE_NAMES = [STATIC_CACHE_NAME, RUNTIME_CACHE_NAME];
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./backup-core.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/app-icon.svg",
];
const STATIC_ASSET_PATHS = new Set(ASSETS.map((asset) => new URL(asset, self.location.href).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pocket-ledger") && !APP_CACHE_NAMES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          const targetCache = STATIC_ASSET_PATHS.has(requestUrl.pathname) ? STATIC_CACHE_NAME : RUNTIME_CACHE_NAME;
          caches.open(targetCache).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
