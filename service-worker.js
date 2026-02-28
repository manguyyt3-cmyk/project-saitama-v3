const CACHE_NAME = "saitama-cache-v2"
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js"
]

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  )
})

// ─── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  )
})

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", event => {
  const data = event.data?.json() || {
    title: "Project Saitama 💪",
    body: "Time for your daily training, hero!"
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "daily-reminder",
      requireInteraction: false
    })
  )
})

// ─── Notification Click → open app ───────────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow("./")
  )
})
