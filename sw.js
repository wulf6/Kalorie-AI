const CACHE = "kalorie-v3";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  // Pouze GET requesty, ne API volání
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Gemini API a OpenFoodFacts jdou vždy přes síť
  if (url.hostname.includes("googleapis.com") ||
      url.hostname.includes("openfoodfacts.org")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Kešuj jen úspěšné odpovědi pro naše vlastní soubory
        if (resp.ok && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached || new Response("Offline", { status: 503 }));
    })
  );
});
