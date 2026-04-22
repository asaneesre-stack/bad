// sw.js — B&B Badminton Service Worker v2
// ตอนนี้ใช้ Cloud Function ส่ง FCM แทน — SW แค่รับ push เท่านั้น ไม่ poll เอง

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const FB_CONFIG = {
  apiKey:            "AIzaSyCwdZT7tzwXyapCfg3wbjRuhiEDeXapghA",
  authDomain:        "b-bad-d088b.firebaseapp.com",
  databaseURL:       "https://b-bad-d088b-default-rtdb.firebaseio.com",
  projectId:         "b-bad-d088b",
  storageBucket:     "b-bad-d088b.firebasestorage.app",
  messagingSenderId: "1062091192895",
  appId:             "1:1062091192895:web:4e08ef9e3b2d6459de568a",
};

firebase.initializeApp(FB_CONFIG);
const messaging = firebase.messaging();

// ── FCM Background push ───────────────────────────────────────────
// Cloud Function ส่ง FCM มา → SW แสดง notification
// ใช้ tag เดิมจาก payload เพื่อให้ iOS replace แทนเพิ่มใหม่
messaging.onBackgroundMessage(payload => {
  console.log('[SW] onBackgroundMessage', payload.notification?.title);
  const { title, body, tag } = payload.notification || {};
  return self.registration.showNotification(title || '🏸 B&B Badminton', {
    body:               body || 'มีการแจ้งเตือนใหม่',
    tag:                tag  || 'badminton-alert',
    icon:               'apple-touch-icon.png',
    badge:              'apple-touch-icon.png',
    vibrate:            [300, 100, 300, 100, 500],
    requireInteraction: true,
    renotify:           false, // ไม่สั่นซ้ำถ้า tag เหมือนกัน
    data:               { url: './display.html' },
  });
});

// ── Install / Activate ────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(clients.claim()));

// ── Notification click ────────────────────────────────────────────
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

// ── Message from page ─────────────────────────────────────────────
// รับ SYNC_STATE แต่ไม่ต้อง poll แล้ว เพราะ Cloud Function จัดการแทน
self.addEventListener('message', event => {
  const { type } = event.data || {};
  if (type === 'SYNC_STATE' || type === 'POLL_NOW' || type === 'START_POLL' || type === 'STOP_POLL') {
    // ignore — Cloud Function รับผิดชอบการส่ง notification แล้ว
  }
});

// ── push event ───────────────────────────────────────────────────
// FCM จะ handle ผ่าน onBackgroundMessage อยู่แล้ว
// push event นี้เป็น fallback กรณี FCM SDK ไม่ intercept
self.addEventListener('push', event => {
  // ปล่อยให้ FCM SDK จัดการผ่าน onBackgroundMessage
  console.log('[SW] push event received');
});
