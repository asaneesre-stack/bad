// sw.js — B&B Badminton Service Worker v6
// iOS แสดง notification จาก APNs เองอยู่แล้ว
// ไม่ต้องให้ SW แสดงซ้ำอีกครั้ง

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

// ── onBackgroundMessage: suppress duplicate ───────────────────────
// iOS จะแสดง notification จาก APNs payload โดยตรงอยู่แล้ว 1 ครั้ง
// ถ้า onBackgroundMessage แสดงซ้ำจะกลายเป็น 2 ครั้ง
// จึงดักไว้แต่ไม่ showNotification — ปล่อยให้ iOS จัดการเอง
messaging.onBackgroundMessage(payload => {
  // ไม่ทำอะไร — ป้องกัน duplicate
  console.log('[SW] onBackgroundMessage suppressed (iOS handles natively)');
  return Promise.resolve();
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

// กด notification → เปิดแอป
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './display.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('display.html') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', () => {});
