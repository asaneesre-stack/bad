// sw.js — B&B Badminton Service Worker v7
// Cloud Function ส่ง data-only push (silent)
// SW แสดง notification เองครั้งเดียวจาก data payload

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

// ── onBackgroundMessage ───────────────────────────────────────────
// รับ data-only push แล้วแสดง notification เองครั้งเดียว
messaging.onBackgroundMessage(payload => {
  const data  = payload.data || {};
  const title = data.title || '🏸 B&B Badminton';
  const body  = data.body  || '';
  const tag   = data.tag   || 'bb-notify';
  const url   = data.url   || './display.html';

  console.log('[SW] showing notification:', title);

  return self.registration.showNotification(title, {
    body,
    tag,
    renotify:           false,
    icon:               'apple-touch-icon.png',
    badge:              'apple-touch-icon.png',
    vibrate:            [300, 100, 300, 100, 500],
    requireInteraction: true,
    data:               { url, tag },
  });
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
