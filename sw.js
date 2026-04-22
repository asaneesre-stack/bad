// sw.js — B&B Badminton Service Worker v4
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCwdZT7tzwXyapCfg3wbjRuhiEDeXapghA",
  authDomain:        "b-bad-d088b.firebaseapp.com",
  databaseURL:       "https://b-bad-d088b-default-rtdb.firebaseio.com",
  projectId:         "b-bad-d088b",
  storageBucket:     "b-bad-d088b.firebasestorage.app",
  messagingSenderId: "1062091192895",
  appId:             "1:1062091192895:web:4e08ef9e3b2d6459de568a",
});

const messaging = firebase.messaging();

// FCM background message — ให้ FCM SDK จัดการเอง
// ไม่ต้อง call onBackgroundMessage เพราะจะทำให้ duplicate
// messaging SDK จะ auto-show notification จาก payload

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

// เมื่อ user กด notification — เปิดแอปและ clear badge
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './display.html';
  event.waitUntil(
    Promise.all([
      // Clear badge
      self.registration.clearAppBadge ? self.registration.clearAppBadge().catch(()=>{}) : Promise.resolve(),
      // เปิดหน้าต่าง
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) {
          if (c.url.includes('display.html') && 'focus' in c) {
            c.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
            return c.focus();
          }
        }
        return clients.openWindow(url);
      })
    ])
  );
});

self.addEventListener('message', () => {});
