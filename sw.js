const CACHE = 'cardio-crew-v63';

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

// ── Motivational quotes (randomised at runtime) ───────────
const MOTIVATIONAL_QUOTES = [
  "You haven't done it yet. That's a fact. It's not a death sentence — but it is a choice you're still making.",
  "The chaos doesn't care that you're tired. Order requires effort. Go be the effort.",
  "Compare yourself to who you were this morning. That person said they'd do this.",
  "Face the dragon. It doesn't shrink while you scroll.",
  "Suffering is the price of meaning. Tonight's workout is cheap by comparison.",
  "You know what to do. The gap between knowing and doing is where character is forged.",
  "The path of least resistance leads to a smaller life. You know this.",
  "Clean your room. Finish your workout. Become someone you can respect.",
  "If you don't sacrifice for what you want, what you want becomes the sacrifice.",
  "Every day you avoid this, the version of yourself you could have been gets further away.",
  "Jocko's alarm goes off at 0430. It is past 6PM. You have zero excuses remaining.",
  "Good. You haven't done it yet. That means you still can. Go.",
  "Discipline is not a feeling. It is a decision. Make it now.",
  "Ownership. Nobody made you skip this. Nobody can make you do it either. That's on you.",
  "It doesn't get easier. You get stronger. That only happens if you show up.",
  "0430 club finished hours ago. Default: aggressive. Toward the workout. Tonight.",
  "There is no 'I'll do it tomorrow' warrior. There is only the one who shows up.",
  "The enemy of your fitness is comfort. Extreme ownership means winning that fight tonight.",
  "You don't rise to the occasion. You fall to your habits. Build a better one right now.",
  "No announcement. No excuses. Just results. Go get them.",
  "Your future self has serious aura. Your current self is one workout away from it.",
  "Aura is not gifted. It's built — rep by rep, day by day, starting tonight.",
  "Sigma move: do the thing when nobody's watching, especially when you don't feel like it.",
  "You're not built different by talking about it. You're built different by doing it at 8PM.",
  "Silent discipline hits different. No announcement. Just results.",
  "The ones with the most aura? They finished already. Still time to join them.",
  "Rizz fades. Discipline compounds. Choose wisely.",
  "The grindset is not a personality. It's a practice. Practice it tonight.",
  "Sigma doesn't negotiate with comfort. Sigma completes the task.",
  "Your aura is taking a hit right now. One workout to restore it.",
  "It's giving NPC behaviour right now. Main characters finish their workout.",
  "No cap — future you is going to be so mad if you skip this.",
  "W behaviour is finishing. L behaviour is scrolling instead. You know which this is.",
  "Bro really said 'I'll do it later.' It IS later. Do it now.",
  "You're cooked if you skip. Uncooked if you go. That's the whole math.",
  "Nah this ain't it chief. Go do the thing.",
  "Ate and left no crumbs — that's what tonight's workout will be. Go eat.",
  "Lowkey the biggest glow-up is just doing what you said you'd do.",
  "It's giving main character energy to push through. NPC energy to stop here.",
  "Sheesh — imagine finishing and feeling this good. You literally can. Right now.",
  "GOATs don't wait for motivation. Motivation waits for GOATs. Be first.",
  "The GOAT moment isn't the trophy. It's 8PM when you didn't feel like it — and did it anyway.",
  "Every legend in history showed up when it was inconvenient. Tonight is your turn.",
  "It's not too late. It's after 6PM and the day still belongs to you. Go claim it.",
  "GOAT status is built in the gaps — the moments where you did it and nobody saw.",
  "The score doesn't remember your excuses. It remembers your results.",
  "Champions train when motivation is gone. This is that moment.",
  "This is now o'clock. There is no better time. There is only now.",
  "One workout. One streak. One version of yourself that kept the promise.",
  "Built different means different choices. Make one right now."
];

function randomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

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
  const name = notifPrefs.userName || 'Warrior';
  const workoutDone = !!notifPrefs.workoutComplete;

  // ── Workout reminder ──────────────────────────────────
  const wo = notifPrefs.workout;
  if (wo?.enabled && wo.time === hhmm && sent.workout !== todayKey) {
    self.registration.showNotification(`💪 ${name}, time to move!`, {
      body: "Complete today's challenges and keep the streak alive 🔥",
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'workout-reminder',
    });
    sent.workout = todayKey;
    self.__notifSent = JSON.stringify(sent);
  }

  // ── Streak saver ──────────────────────────────────────
  const st = notifPrefs.streak;
  if (st?.enabled && st.time === hhmm && !workoutDone && sent.streak !== todayKey) {
    self.registration.showNotification(`🔥 ${name}, don't break the streak!`, {
      body: randomQuote(),
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'streak-saver',
    });
    sent.streak = todayKey;
    self.__notifSent = JSON.stringify(sent);
  }

  // ── Evening motivational nudge (6PM, only if workout not done) ──
  const ev = notifPrefs.evening;
  if (ev?.enabled && hhmm === '18:00' && !workoutDone && sent.evening !== todayKey) {
    self.registration.showNotification(`⚡ ${name} — it's go time.`, {
      body: randomQuote(),
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      tag: 'evening-nudge',
    });
    sent.evening = todayKey;
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
