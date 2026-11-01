// Prime Haven Service Worker — Web Push & Device Notifications
const SW_VERSION = 'ph-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Prime Haven Alert',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'Prime Haven';
  const options = {
    body: data.body || data.message || 'You have a new update.',
    icon: data.icon || '/logo-512.png',
    badge: data.badge || '/favicon.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag: data.tag || `ph-notif-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || data.link || '/',
      timestamp: Date.now(),
      ...data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open Prime Haven' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click on any device (phone, laptop, tablet)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus and navigate to target URL
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open new window/PWA
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle direct messages from foreground/background app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const title = event.data.title || 'Prime Haven';
    const options = {
      body: event.data.body || event.data.message || '',
      icon: event.data.icon || '/logo-512.png',
      badge: event.data.badge || '/favicon.png',
      vibrate: [200, 100, 200],
      tag: event.data.tag || `ph-msg-${Date.now()}`,
      renotify: true,
      data: {
        url: event.data.url || event.data.link || '/',
        ...event.data,
      },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } else if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
