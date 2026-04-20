// sw.js — Service Worker สำหรับ B&B Badminton
// รองรับ Push Notification แม้ปิดหน้าจอ (ต้องให้สิทธิ์ Notification ก่อน)

const CACHE_NAME = 'bb-badminton-v1';

// ── Install ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ── Push Event (จาก Push Server หรือ showNotification) ───────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🏸 B&B Badminton';
  const options = {
    body: data.body || 'มีการแจ้งเตือนใหม่',
    icon: 'apple-touch-icon.png',
    badge: 'apple-touch-icon.png',
    tag: data.tag || 'badminton-alert',
    vibrate: [200, 80, 200, 80, 400],
    requireInteraction: true,
    data: { url: data.url || './display.html' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './display.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // โฟกัสหน้าต่างที่เปิดอยู่แล้ว หรือเปิดใหม่
      for (const client of list) {
        if (client.url.includes('display.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Fetch (Network First — รองรับ offline บางส่วน) ───────────────
self.addEventListener('fetch', event => {
  // ให้ Firebase และ CDN ผ่านไปได้เลย
  if (event.request.url.includes('firebase') || event.request.url.includes('cdn.')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
