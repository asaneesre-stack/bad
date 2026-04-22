// sw.js — B&B Badminton Service Worker v3 (minimal)
// ให้ FCM SDK จัดการ notification เองทั้งหมด ไม่แทรกแซง

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

// FCM SDK จัดการ background message เองโดยอัตโนมัติ
// ไม่ต้อง call onBackgroundMessage เอง เพราะมันจะ duplicate
const messaging = firebase.messaging();

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './display.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('display.html') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ไม่ต้องทำอะไรกับ message จาก page
self.addEventListener('message', () => {});
