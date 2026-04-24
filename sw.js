// sw.js — B&B Badminton Service Worker v12
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

messaging.onBackgroundMessage(payload => {
  const data  = payload.data || {};
  const title = data.title  || payload.notification?.title || '🏸 B&B Badminton';
  const body  = data.body   || payload.notification?.body  || 'มีการแจ้งเตือนใหม่';
  const tag   = data.tag    || 'bb-notify';
  const url   = data.url    || './display.html';

  // visibilityState ไม่มีใน SW — เช็คแค่ว่า client มีอยู่ไหม
  // ถ้า display.html เปิด = foreground แล้วจัดการเองผ่าน triggerAlert
  // ถ้าไม่มี client = background/killed → SW ต้องแสดงเอง
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const displayOpen = list.some(c => c.url.includes('display.html'));
    if (displayOpen) {
      // page เปิดอยู่ — ส่ง message ให้ page จัดการแทน ไม่ showNotification ซ้ำ
      list.forEach(c => {
        if (c.url.includes('display.html')) {
          c.postMessage({ type: 'FCM_BACKGROUND', payload });
        }
      });
      return;
    }

    // page ปิด/พับจอ — SW แสดง notification เอง
    return self.registration.showNotification(title, {
      body,
      tag,
      renotify:           true,
      icon:               './apple-touch-icon.png',
      badge:              './apple-touch-icon.png',
      vibrate:            [200, 80, 200],
      requireInteraction: true,
      data:               { url },
    });
  });
});

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
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
