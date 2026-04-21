// sw.js — B&B Badminton Service Worker v2
// แก้ปัญหา iOS: ใช้ push event + REST poll แทน setInterval

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
// iOS 16.4+ Add to Home Screen จะได้รับ push นี้
messaging.onBackgroundMessage(payload => {
  const { title, body, tag } = payload.notification || {};
  return self.registration.showNotification(title || '🏸 B&B Badminton', {
    body:              body || 'มีการแจ้งเตือนใหม่',
    tag:               tag  || 'badminton-alert',
    icon:              'apple-touch-icon.png',
    badge:             'apple-touch-icon.png',
    vibrate:           [200, 80, 200, 80, 400],
    requireInteraction:true,
    data:              { url: './display.html' },
  });
});

// ── Install / Activate ────────────────────────────────────────────
self.addEventListener('install',  ()  => self.skipWaiting());
self.addEventListener('activate', e   => e.waitUntil(clients.claim()));

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

// ═══════════════════════════════════════════════════════════════════
// IDB helpers
// ═══════════════════════════════════════════════════════════════════
const DB_NAME = 'bb-sw-state';

function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const r  = tx.objectStore('kv').get(key);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror   = rej;
  });
}

async function idbSet(key, val) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = res;
    tx.onerror    = rej;
  });
}

// ═══════════════════════════════════════════════════════════════════
// Firebase REST fetch
// ═══════════════════════════════════════════════════════════════════
async function fbGet(path) {
  try {
    const r = await fetch(`${FB_CONFIG.databaseURL}/${path}.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return r.json();
  } catch(e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════
// Core poll & notify
// ═══════════════════════════════════════════════════════════════════
async function pollAndNotify() {
  const watchedIds    = await idbGet('watchedIds')   || [];
  const alertShownRaw = await idbGet('alertShown')   || {};

  if (watchedIds.length === 0) return;

  const fbState = await fbGet('badmintonState');
  if (!fbState) return;

  const queues  = fbState.matchQueues ? Object.values(fbState.matchQueues)  : [];
  const players = fbState.players     ? Object.values(fbState.players)      : [];

  function getPos(pid) {
    for (let i = 0; i < queues.length; i++) {
      const ids = [...(queues[i].team1||[]), ...(queues[i].team2||[])].map(Number);
      if (ids.includes(+pid)) return i + 1;
    }
    return 0;
  }

  function getName(pid) {
    const p = players.find(pl => +pl.id === +pid);
    return p ? p.name : '???';
  }

  let changed = false;

  for (const pid of watchedIds) {
    const pos  = getPos(pid);
    const k1   = `${pid}-next`;   // ถึงคิวแรก
    const k2   = `${pid}-court`;  // ลงสนามแล้ว

    if (pos >= 2) {
      // รีเซ็ต alert ทั้งหมดเมื่อกลับไปอยู่คิวหลัง
      if (alertShownRaw[k1] || alertShownRaw[k2]) {
        alertShownRaw[k1] = false;
        alertShownRaw[k2] = false;
        changed = true;
      }

    } else if (pos === 1) {
      // ถึงคิวแรก — แจ้งเตือน
      if (!alertShownRaw[k1]) {
        alertShownRaw[k1] = true;
        changed = true;
        await self.registration.showNotification('🏸 ถึงคิวของคุณแล้ว!', {
          body:               `${getName(pid)} — เตรียมพร้อม!`,
          tag:                k1,
          icon:               'apple-touch-icon.png',
          badge:              'apple-touch-icon.png',
          vibrate:            [300, 100, 300, 100, 500],
          requireInteraction: true,
          data:               { url: './display.html' },
        });
      }

    } else {
      // pos === 0 ไม่อยู่ในคิว
      // ถ้าเคยถึงคิว 1 แล้ว (k1 = true) แสดงว่าถูกเรียกขึ้นสนามแล้ว
      if (alertShownRaw[k1] && !alertShownRaw[k2]) {
        alertShownRaw[k2] = true;
        changed = true;
        await self.registration.showNotification('✅ ลงสนามได้เลย!', {
          body:               `${getName(pid)} — สนามรอคุณอยู่!`,
          tag:                k2,
          icon:               'apple-touch-icon.png',
          badge:              'apple-touch-icon.png',
          vibrate:            [200, 80, 200, 80, 200, 80, 600],
          requireInteraction: true,
          data:               { url: './display.html' },
        });
      }
    }
  }

  if (changed) await idbSet('alertShown', alertShownRaw);
}

// ═══════════════════════════════════════════════════════════════════
// Message from page
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  const { type, watchedIds, alertShown } = event.data || {};

  if (type === 'SYNC_STATE') {
    // ใช้ event.waitUntil เพื่อไม่ให้ SW terminate ก่อนบันทึกเสร็จ
    event.waitUntil((async () => {
      if (watchedIds !== undefined) await idbSet('watchedIds', watchedIds);
      if (alertShown !== undefined) await idbSet('alertShown', alertShown);
    })());
  }

  if (type === 'POLL_NOW') {
    // Page ขอให้ poll ทันที (เช่น ตอน visibilitychange)
    event.waitUntil(pollAndNotify());
  }
});

// ═══════════════════════════════════════════════════════════════════
// Periodic Background Sync — iOS/Android รุ่นใหม่รองรับ
// ลงทะเบียนใน display.html ด้วย periodicSync.register('bb-poll')
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bb-poll') {
    event.waitUntil(pollAndNotify());
  }
});

// ═══════════════════════════════════════════════════════════════════
// Push event — fallback สำหรับ FCM push ที่ส่งมาจาก server
// (ถ้าตั้ง Cloud Function ส่ง push ได้)
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  event.waitUntil(pollAndNotify());
});

// ═══════════════════════════════════════════════════════════════════
// Sync event — Background Sync API (one-shot)
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
  if (event.tag === 'bb-poll-once') {
    event.waitUntil(pollAndNotify());
  }
});
