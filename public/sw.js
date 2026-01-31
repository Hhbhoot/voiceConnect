/// <reference lib="webworker" />

const CACHE_NAME = "voiceconnect-v1";
const urlsToCache = ["/", "/index.html", "/placeholder.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "reply") {
    // Focus window and navigate to chat
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url && "focus" in client) {
              // Ideally navigate to specific chat if we can pass data
              // client.navigate('/chat?user=' + event.notification.data.senderId);
              return client.focus();
            }
          }
          // If no window open, open new one
          if (self.clients.openWindow) {
            return self.clients.openWindow("/");
          }
        }),
    );
  } else if (event.action === "mark_read") {
    // Send request to server to mark as read
    console.log("Mark as read clicked for:", event.notification);
    const { apiUrl, userId, senderId, token } = event.notification.data;

    if (apiUrl && userId && senderId && token) {
      const markReadUrl = `${apiUrl}/chat/${userId}/${senderId}/read`;
      console.log("Marking read via SW:", markReadUrl);

      event.waitUntil(
        fetch(markReadUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (response.ok) {
              console.log("Successfully marked as read via SW");
            } else {
              console.error("Failed to mark as read via SW");
            }
          })
          .catch((error) => {
            console.error("Error marking as read via SW:", error);
          }),
      );
    } else {
      console.error(
        "Missing data for mark as read action",
        event.notification.data,
      );
    }
  } else {
    // Default click - focus window
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url && "focus" in client) {
              return client.focus();
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow("/");
          }
        }),
    );
  }
});
