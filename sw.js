// sw.js — B&B Badminton Service Worker v9
// ส่ง notification ปกติผ่าน APNs + apns-collapse-id
// SW suppress onBackgroundMessage ป้องกัน duplicate

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

// APNs แสดง notification เองจาก payload แล้ว 1 ครั้ง
// onBackgroundMessage ต้องมี (FCM SDK บังคับ) แต่ไม่ showNotification
// เพราะถ้า showNotification จะเป็น 2 ครั้ง
messaging.onBackgroundMessage(payload => {
  // ไม่ทำอะไร — APNs จัดการแสดงให้แล้ว
  return Promise.resolve();
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // ลบ notification ที่เหลือทั้งหมด
  self.registration.getNotifications().then(ns => ns.forEach(n => n.close()));
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
