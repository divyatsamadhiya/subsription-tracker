const CACHE_NAME = "pulseboard-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET, API, and chrome-extension requests
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    !request.url.startsWith("http")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful same-origin responses (skip errors)
        if (
          response.ok &&
          response.type === "basic" &&
          response.status !== 404
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline fallback — serve from cache if available
        caches.match(request).then((cached) => cached || new Response("Offline", { status: 503 }))
      )
  );
});
