/*
 * Service worker: web push notifications, plus a friendly offline page.
 * Only the static offline page is cached; no page, API answer or personal data is ever cached.
 */
const OFFLINE_CACHE = "ihkw-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ihkw-offline-") && k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Page loads always go to the network. Only when the network is unreachable is the offline page
// shown instead; it reloads the requested page by itself once the connection is back.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;
  event.respondWith(
    fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }))),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Monde d’Isabelle", body: "", url: "/home", tag: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
