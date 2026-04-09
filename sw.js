const CACHE = 'cardio-crew-v18';

// Detect base path dynamically — works for /CardioCrew/, /CardioCrew-DEV/, or any deployment
const BASE = self.location.pathname.replace(/\/sw\.js$/, '') + '/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      BASE,
      BASE + 'index.html',
      BASE + 'manifest.json',
      BASE + 'icons/icon-192.png',
      BASE + 'icons/icon-512.png'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === BASE) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});

// ── Notification scheduling ───────────────────────────────
// Stores latest prefs sent from the app
let notifPrefs = {};

self.addEventListener('message', e => {
  if (e.data?.type === 'UPDATE_NOTIF_PREFS') {
    notifPrefs = e.data.prefs || {};
  }
});

// Check every minute whether a notification is due
function checkNotifications() {
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dow  = now.getDay(); // 0=Sun … 6=Sat
  const sent = JSON.parse(self.__notifSent || '{}');
  const todayKey = now.toISOString().slice(0, 10);

  // ── Workout reminder ──────────────────────────────────
  const wo = notifPrefs.workout;
  if (wo?.enabled && wo.time === hhmm && sent.workout !== todayKey) {
    self.registration.showNotification('💪 CardioCrew', {
      body: "Time to complete today's challenges! Keep the streak alive 🔥",
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'workout-reminder',
    });
    sent.workout = todayKey;
    self.__notifSent = JSON.stringify(sent);
  }

  // ── Weigh-in reminder ─────────────────────────────────
  const wi = notifPrefs.weighin;
  if (wi?.enabled && wi.time === hhmm && String(dow) === String(wi.day || '1') && sent.weighin !== todayKey) {
    self.registration.showNotification('⚖️ CardioCrew', {
      body: "Time to log your weight — keep tracking your progress!",
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'weighin-reminder',
    });
    sent.weighin = todayKey;
    self.__notifSent = JSON.stringify(sent);
  }

  // ── Streak saver ──────────────────────────────────────
  const st = notifPrefs.streak;
  if (st?.enabled && st.time === hhmm && sent.streak !== todayKey) {
    self.registration.showNotification('🔥 CardioCrew', {
      body: "Don't break your streak! Complete today's challenges before midnight.",
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'streak-saver',
    });
    sent.streak = todayKey;
    self.__notifSent = JSON.stringify(sent);
  }
}

// Poll every 60 seconds when the SW is alive
self.__notifSent = '{}';
setInterval(checkNotifications, 60_000);

// Click on notification opens the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(BASE));
      if (existing) { existing.focus(); return; }
      clients.openWindow(BASE);
    })
  );
});
