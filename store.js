// The pages' one data door. load(key) / save(key, doc).
// Server is the truth; localStorage is a cache so pages render instantly and still work offline.
// A page that only has the cache (no server yet, or signed out) keeps working exactly as before.
(function () {
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem('hq.' + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem('hq.' + k, JSON.stringify(v)); } catch {} },
  };
  const timers = {};

  async function load(key) {
    const cached = ls.get(key);
    try {
      const r = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (r.status === 401) { window.store.signedOut = true; return cached; }
      if (!r.ok) return cached;
      const doc = await r.json();
      if (doc && doc.data !== undefined) { ls.set(key, doc.data); return doc.data; }
      if (cached) save(key, cached);           // first run against an empty server: seed it from the cache
      return cached;
    } catch { return cached; }                 // offline or no API (plain static server): cache it is
  }

  function save(key, doc) {
    ls.set(key, doc);
    clearTimeout(timers[key]);                 // ponytail: debounce, last write wins; no conflict handling for one user
    timers[key] = setTimeout(() => {
      fetch(`/api/state?key=${encodeURIComponent(key)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) })
        .catch(() => {});
    }, 400);
  }

  async function signIn(passcode) {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode }) });
    return r.ok;
  }
  const signOut = () => fetch('/api/login', { method: 'DELETE' });

  window.store = { load, save, signIn, signOut, signedOut: false };
})();
