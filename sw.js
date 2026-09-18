// HQ's service worker: it exists to receive pushes. No caching — the pages have localStorage for that.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

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
