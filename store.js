// The pages' one data door. load(key) / save(key, doc).
// Server is the truth; localStorage is a cache so pages render instantly and still work offline.
// A page that only has the cache (no server yet, or signed out) keeps working exactly as before.
(function () {
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem('hq.' + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem('hq.' + k, JSON.stringify(v)); } catch {} },
  };
  const timers = {}, loaded = {}, seen = {}, pending = {};
  let inflight = 0, settle;                      // when every load in flight has answered and nothing new starts, the page has drawn: drop the splash
  let queue = {}, flushing = null;               // loads asked for in the same tick travel to the server as one request   // a key can be saved only after its load has answered; `seen` is the server's updated_at we last read

  // bg: a load the page is not waiting on to draw (the bell's notices), so it does not hold the splash
  async function load(key, bg = false) {
    if (!bg) { inflight++; clearTimeout(settle); }
    try { return await new Promise(resolve => { (queue[key] ||= []).push(resolve); flushing ||= setTimeout(flush, 0); }); }
    finally { loaded[key] = true; if (!bg && --inflight === 0) settle = setTimeout(() => window.hqReveal && window.hqReveal(), 80); }
  }
  async function flush() {
    const q = queue; queue = {}; flushing = null;
    const keys = Object.keys(q), docs = await fetchDocs(keys);
    for (const key of keys) {
      const cached = ls.get(key), doc = docs && docs[key]; let out = cached;
      if (doc && doc.data !== undefined) { ls.set(key, doc.data); seen[key] = doc.updated_at; out = doc.data; }
      else if (docs && cached) { loaded[key] = true; save(key, cached); }   // first run against an empty server: seed it from the cache
      q[key].forEach(resolve => resolve(out));
    }
  }
  async function fetchDocs(keys) {           // { key: { data, updated_at } | null }, or null when the server did not answer
    try {
      const r = await fetch(`/api/state?keys=${keys.map(encodeURIComponent).join(',')}`, { cache: 'no-store' });
      if (r.status === 401) { window.store.signedOut = true; return null; }
      offline(false);
      return r.ok ? await r.json() : null;
    } catch { offline(true); return null; }    // offline or no API (plain static server): cache it is
  }
  // with no network the pages still open on their last copy; say so quietly rather than let it look live
  let note;
  function offline(on) {
    if (on && !navigator.onLine && !note) {
      note = document.createElement('div'); note.textContent = 'Offline — showing your last copy.';
      note.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--band,#1F3A2E);color:var(--band-ink,#F2ECDF);font:13px/1.4 var(--sans,system-ui);padding:9px 16px;border-radius:999px;opacity:.92;z-index:50;pointer-events:none';
      document.body.appendChild(note);
      addEventListener('online', () => location.reload(), { once: true });
    } else if (!on && note) { note.remove(); note = null; }
  }

  function save(key, doc) {
    if (!loaded[key]) return;                  // still waiting on the server: nothing to save yet
    ls.set(key, doc);
    clearTimeout(timers[key]); pending[key] = doc;
    timers[key] = setTimeout(() => put(key), 400);   // debounced; a stale base comes back as a conflict
  }
  async function put(key, keepalive = false) {
    const doc = pending[key]; if (doc === undefined) return; delete pending[key]; clearTimeout(timers[key]);
    try {
      const headers = { 'content-type': 'application/json' }; if (seen[key]) headers['x-hq-base'] = seen[key];
      const r = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { method: 'PUT', headers, body: JSON.stringify(doc), keepalive });
      if (r.status === 409) { const cur = await r.json(); ls.set(key, cur.data); seen[key] = cur.updated_at; changedElsewhere(); return; }
      if (r.ok) { const j = await r.json().catch(() => ({})); if (j.updated_at) seen[key] = j.updated_at; }
    } catch {}
  }
  // another device wrote this document since the page loaded: take the newer copy and start again from it
  let told = false;
  function changedElsewhere() {
    if (told) return; told = true;
    const t = document.createElement('div');
    t.textContent = 'Changed on another device — showing the latest. Redo your last edit if it is missing.';
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:calc(100vw - 40px);background:var(--band,#1F3A2E);color:var(--band-ink,#F2ECDF);font:14px/1.4 var(--sans,system-ui);padding:12px 18px;border-radius:10px;box-shadow:0 6px 18px -6px rgba(0,0,0,.3);z-index:50;text-align:center';
    document.body.appendChild(t);
    setTimeout(() => location.reload(), 2800);
  }
  // back to a tab after a while: if any document moved on the server and nothing is half-typed here, take the fresh copy
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || Object.keys(pending).length) return;
    const keys = Object.keys(seen).filter(k => k !== 'sync'); if (!keys.length) return;   // the sync ledger is read, never edited here
    const docs = await fetchDocs(keys); if (!docs) return;
    for (const key of keys) { const doc = docs[key];
      if (doc && doc.updated_at && new Date(doc.updated_at).getTime() !== new Date(seen[key]).getTime()) { ls.set(key, doc.data); location.reload(); return; } }
  });
  // leaving the page: flush anything still waiting in the debounce
  addEventListener('pagehide', () => { for (const key of Object.keys(pending)) put(key, true); });

  async function signIn(passcode) {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passcode }) });
    return r.ok;
  }
  const signOut = () => fetch('/api/login', { method: 'DELETE' });
  // run a source's sync now; resolves to the ledger entry ({ ok, last, ... }) or null when there is no API
  const sync = async name => { try { const r = await fetch(`/api/sync/${name}`, { method: 'POST' }); return await r.json(); } catch { return null; } };
  const ledger = async () => (await load('sync', true)) || {};

  window.store = { load, save, signIn, signOut, sync, ledger, signedOut: false };
})();
