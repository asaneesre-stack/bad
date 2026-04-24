// sw.js — B&B Badminton Service Worker v11
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

  // เช็คว่า display.html เปิดอยู่ไหม
  // ถ้าเปิดอยู่ = display.html จัดการแสดงแล้ว ไม่ต้อง showNotification ซ้ำ
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const isOpen = list.some(c => c.url.includes('display.html') && !c.hidden);
    if (isOpen) return; // page เปิดอยู่ ไม่แสดงซ้ำ

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
