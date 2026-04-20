// sw.js — B&B Badminton Service Worker
// iOS fallback: poll Firebase ทุก 30 วิ เมื่อ FCM push ไม่ถึง

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
messaging.onBackgroundMessage(payload => {
  const { title, body, tag } = payload.notification || {};
  return self.registration.showNotification(title || '🏸 B&B Badminton', {
    body: body || 'มีการแจ้งเตือนใหม่',
    tag:  tag  || 'badminton-alert',
    icon: 'apple-touch-icon.png',
    badge:'apple-touch-icon.png',
    vibrate: [200, 80, 200, 80, 400],
    requireInteraction: true,
    data: { url: './display.html' },
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
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for (const c of list) {
        if (c.url.includes('display.html') && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── iOS Polling Fallback ──────────────────────────────────────────
// iOS อาจ throttle FCM push — SW poll Firebase REST API ทุก 30 วิแทน
// เก็บ state ใน IndexedDB เพื่อไม่แจ้งเตือนซ้ำ

const DB_NAME   = 'bb-sw-state';
const POLL_INTERVAL_MS = 30000; // 30 วินาที
let _pollTimer = null;

// ── IDB helpers ───────────────────────────────────────────────────
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = e => {
      e.target.result.createObjectStore('kv');
    };
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const r  = tx.objectStore('kv').get(key);
    r.onsuccess = () => res(r.result);
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

// ── Fetch Firebase REST ───────────────────────────────────────────
async function fbGet(path) {
  const url = `${FB_CONFIG.databaseURL}/${path}.json`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// ── Poll logic ────────────────────────────────────────────────────
async function pollAndNotify() {
  try {
    // อ่าน watchedIds ที่ page บันทึกไว้
    const watchedRaw = await idbGet('watchedIds');
    if (!watchedRaw || watchedRaw.length === 0) return;
    const watchedIds = watchedRaw; // array of pid numbers

    // อ่าน alertShown state
    const alertShownRaw = await idbGet('alertShown') || {};

    // ดึง state จาก Firebase
    const state = await fbGet('badmintonState');
    if (!state) return;

    const queues  = state.matchQueues  ? Object.values(state.matchQueues)  : [];
    const players = state.players      ? Object.values(state.players)      : [];

    function getPos(pid) {
      for (let i = 0; i < queues.length; i++) {
        const q = queues[i];
        const ids = [...(q.team1||[]), ...(q.team2||[])].map(Number);
        if (ids.includes(+pid)) return i + 1;
      }
      return 0;
    }

    function getPlayerName(pid) {
      const p = players.find(pl => +pl.id === +pid);
      return p ? p.name : '???';
    }

    let stateChanged = false;

    for (const pid of watchedIds) {
      const pos  = getPos(pid);
      const key1 = `${pid}-next`;
      const key2 = `${pid}-court`;

      if (pos >= 2) {
        if (alertShownRaw[key1] || alertShownRaw[key2]) {
          alertShownRaw[key1] = false;
          alertShownRaw[key2] = false;
          stateChanged = true;
        }
      } else if (pos === 1) {
        if (alertShownRaw[key2]) {
          alertShownRaw[key1] = false;
          alertShownRaw[key2] = false;
          stateChanged = true;
        }
        if (!alertShownRaw[key1]) {
          alertShownRaw[key1] = true;
          stateChanged = true;
          const name = getPlayerName(pid);
          await self.registration.showNotification('🏸 ถึงคิวของคุณแล้ว!', {
            body: `${name} — เตรียมพร้อม!`,
            tag:  key1,
            icon: 'apple-touch-icon.png',
            badge:'apple-touch-icon.png',
            vibrate: [300, 100, 300, 100, 500],
            requireInteraction: true,
            data: { url: './display.html' },
          });
        }
      } else {
        // pos === 0
        if (alertShownRaw[key1] && !alertShownRaw[key2]) {
          alertShownRaw[key2] = true;
          stateChanged = true;
          const name = getPlayerName(pid);
          await self.registration.showNotification('✅ สนามว่างแล้ว!', {
            body: `${name} — ลงสนามได้เลย!`,
            tag:  key2,
            icon: 'apple-touch-icon.png',
            badge:'apple-touch-icon.png',
            vibrate: [200, 80, 200, 80, 200, 80, 600],
            requireInteraction: true,
            data: { url: './display.html' },
          });
        }
      }
    }

    if (stateChanged) await idbSet('alertShown', alertShownRaw);
  } catch(e) {
    console.warn('[SW poll]', e);
  }
}

// ── Message from page: sync state & start/stop polling ───────────
self.addEventListener('message', async event => {
  const { type, watchedIds, alertShown } = event.data || {};

  if (type === 'SYNC_STATE') {
    // Page ส่ง watchedIds และ alertShown state มาให้ SW เก็บไว้
    if (watchedIds !== undefined) await idbSet('watchedIds', watchedIds);
    if (alertShown !== undefined) await idbSet('alertShown', alertShown);
  }

  if (type === 'START_POLL') {
    if (_pollTimer) return; // ทำงานอยู่แล้ว
    await pollAndNotify(); // poll ทันที
    _pollTimer = setInterval(pollAndNotify, POLL_INTERVAL_MS);
  }

  if (type === 'STOP_POLL') {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }
});

// ── Background sync (รองรับ periodic background sync บางรุ่น) ─────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bb-poll') event.waitUntil(pollAndNotify());
});
