importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE = "etur-pwa-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.delete(CACHE).catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;
  if (request.mode === "navigate" || request.destination === "document") return;
  if (request.destination === "script" || request.destination === "style") return;

  event.respondWith(fetch(request).catch(() => Response.error()));
});
