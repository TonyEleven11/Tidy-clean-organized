// Offline cache for the app shell. Bump CACHE_NAME AND the ?v= query string
// on styles.css/app.js in index.html whenever you change either of those
// two files — belt-and-suspenders alongside the network-first fetch
// strategy below (see the fetch handler for why that matters more). The
// ?v= match here has to stay in sync with index.html's <link>/<script>
// tags or this precache just wastes a request on a URL nothing else asks
// for.
const CACHE_NAME = "tidy-app-shell-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=11",
  "./app.js?v=11",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version when the phone
// has a connection (the normal case), only falling back to the cached
// copy when offline. An earlier cache-first version of this file could
// show a stale mix of old/new files for a visit or two after an update —
// this avoids that instead of just working around it.
//
// { cache: "reload" } below is deliberate and important: a plain
// fetch(event.request) can still be silently answered by the *browser's*
// own HTTP cache (governed by GitHub Pages' response headers), completely
// bypassing this network-first logic without either of us knowing — this
// forces an actual round-trip to the server every time, ignoring any
// local HTTP cache entry, so an upload to GitHub always shows up on next
// load instead of only "eventually".
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "reload" })
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
