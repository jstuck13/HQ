// HQ's service worker: it receives pushes, and it keeps the shell — the pages themselves — so the app opens
// at once and still opens with no signal. Data is never cached here: /api goes to the network, and store.js
// already keeps a localStorage copy of every document for when the network is not there.
const V = 'hq-shell-1';
const SHELL = [
  '/', '/index.html', '/today.html', '/calendar.html', '/finances.html', '/groceries.html', '/investments.html',
  '/library.html', '/school.html', '/health.html', '/review.html', '/study.html',
  '/hq.css', '/hq.js', '/clock.js', '/store.js', '/bell.js', '/search.js', '/icons.svg', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png',
  '/paths/index.json', '/paths/stoics.json', '/paths/socrates.json', '/paths/sermon.json',
];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));

// The shell is served from the cache and refreshed behind you, so a page paints immediately and picks up a
// deploy on the next visit. Anything else — /api above all — is left alone.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  e.respondWith(caches.open(V).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(r => { if (r.ok && r.type === 'basic') cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || fresh;
  }));
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: 'HQ', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'HQ', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || 'hq', renotify: false, data: { url: d.url || '/today.html' },
  }));
});

// tapping a notice opens the page it is about, reusing an HQ tab if one is open
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || '/today.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.location.origin));
    return open ? open.focus().then(c => c.navigate ? c.navigate(url) : null) : self.clients.openWindow(url);
  }));
});
