// firebase-messaging-sw.js
// iOS Safari ต้องการไฟล์นี้แยกต่างหากสำหรับ FCM background push
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
  const { title, body, tag } = payload.notification || {};
  return self.registration.showNotification(title || '🏸 B&B Badminton', {
    body:               body || 'มีการแจ้งเตือนใหม่',
    tag:                tag  || 'badminton-alert',
    icon:               'apple-touch-icon.png',
    badge:              'apple-touch-icon.png',
    vibrate:            [200, 80, 200, 80, 400],
    requireInteraction: true,
    data:               { url: './display.html' },
  });
});

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
