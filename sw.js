// sw.js — B&B Badminton Service Worker v5
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

// ── FCM Background Message ────────────────────────────────────────
// ใช้ tag เดิมจาก payload เสมอ → iOS replace แทนเพิ่มใหม่
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || '🏸 B&B Badminton';
  const body  = payload.notification?.body  || '';
  const tag   = payload.notification?.tag   || payload.data?.tag || 'bb-notify';

  // เช็คว่ามี notification tag นี้อยู่แล้วไหม — ถ้ามีให้ replace ไม่ต้องแสดงซ้ำ
  return self.registration.getNotifications({ tag }).then(existing => {
    // ไม่ว่าจะมีหรือไม่ — show ด้วย tag เดิม → iOS จะ replace อัตโนมัติ
    return self.registration.showNotification(title, {
      body,
      tag,                  // key สำคัญ: tag เดิม = replace ไม่เพิ่มใหม่
      renotify: false,      // ไม่สั่น/เสียงซ้ำถ้า tag เหมือนกัน
      icon:               'apple-touch-icon.png',
      badge:              'apple-touch-icon.png',
      vibrate:            [300, 100, 300, 100, 500],
      requireInteraction: true,
      data:               { url: './display.html', tag },
    });
  });
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

// กด notification → เปิดแอป + ลบ notification ทั้งหมด
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || './display.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // ลบ notification ที่เหลือทั้งหมด
      self.registration.getNotifications().then(ns => ns.forEach(n => n.close()));
      for (const c of list) {
        if (c.url.includes('display.html') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', () => {});
