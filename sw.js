// HQ's service worker: it receives pushes, and it keeps the shell — the pages themselves — so the app opens
// at once and still opens with no signal. Data is never cached here: /api goes to the network, and store.js
// already keeps a localStorage copy of every document for when the network is not there.
const V = 'hq-shell-3';   // a new name empties the old one on activate: raise it whenever what is kept must go
const SHELL = [
  '/', '/index.html', '/today.html', '/calendar.html', '/finances.html', '/groceries.html', '/investments.html',
  '/library.html', '/school.html', '/health.html', '/review.html', '/study.html', '/patterns.html', '/day.html',
  '/restore.html', '/span.html', '/list.html', '/digest.js', '/recur.js', '/capture.js',
  '/hq.css', '/hq.js', '/clock.js', '/store.js', '/bell.js', '/search.js', '/icons.svg', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png',
  '/paths/index.json', '/paths/stoics.json', '/paths/socrates.json', '/paths/sermon.json',
];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));

// A page, a script or a stylesheet is asked of the network first, so a deploy is in your hands on this open and
// not the next one. That matters more than a few milliseconds of paint: a kept copy of today.html goes on
// running last week's reading of the to-do list, and goes on writing what it believes back to the server. With
// no signal the kept copy answers instead, which is the whole point of keeping it.
// Everything else — pictures, icons, the reading paths — is served from what is kept and refreshed behind you.
// Data is never any of this: /api and version.json always go to the network.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js' || url.pathname === '/version.json') return;
  const live = url.pathname === '/' || /\.(?:html|js|css)$/.test(url.pathname);
  e.respondWith(caches.open(V).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(r => { if (r.ok && r.type === 'basic') cache.put(e.request, r.clone()); return r; }).catch(() => null);
    if (live) return (await fresh) || hit || fetch(e.request);
    return hit || (await fresh) || fetch(e.request);
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
