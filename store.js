// The pages' one data door. load(key) / save(key, doc).
// Server is the truth; localStorage is a cache so pages render instantly and still work offline.
// A page that only has the cache (no server yet, or signed out) keeps working exactly as before.

// One address, or none of the above holds. Every Vercel deployment also answers on a one-off hostname of its
// own, and a browser keeps cookies and localStorage per hostname — so opening HQ there asks for the passcode
// again, shows a directory nobody arranged, and, being signed out, falls back to that origin's empty cache
// instead of the server. It looks for all the world like two devices disagreeing about your data. They are not
// disagreeing; they are two different origins. So a deployment host hands you to the address it is all kept
// under. ?stay opts out, for looking at a preview on purpose. This is the first thing in the first shared
// script, because it has to happen before anything is read.
(function () {
  const HOME = 'hq-six-puce.vercel.app';
  const h = location.hostname;
  if (h !== HOME && h.endsWith('.vercel.app') && !/(?:^|[?&])stay(?:[=&]|$)/.test(location.search))
    location.replace(`${location.protocol}//${HOME}${location.pathname}${location.search}${location.hash}`);
})();

// Nothing told you when a page broke. A render that threw left a half-drawn page behind a curtain that lifted
// on its own four-second timer, and HQ said not a word — so every fault had to be noticed by eye, which is a
// poor way to find out that yesterday's to-dos are missing. A page that throws now says so, once and quietly,
// and the last twenty are kept in this browser so they can be read back afterwards. Nothing is sent anywhere:
// an error reporter that needs the network is one more thing to fail, and a write on every error is a loop
// waiting to happen if what broke was the writing.
(function () {
  const KEY = 'hq!oops', KEEP = 20;
  const page = () => (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const write = l => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-KEEP))); } catch {} };
  window.hqOops = { list: read, clear: () => write([]) };

  // One notice at a time, and it keeps the FIRST message. When a render breaks it usually takes several things
  // down with it, and the first is the one that explains the rest; replacing it with the latest would bury the
  // cause under its own consequences. Anything else that goes wrong afterwards is counted, not spelled out.
  let bar = null, first = '', extra = 0;
  function show(what) {
    if (bar) {
      if (what === first) return;                         // the same thing again says nothing new
      bar.querySelector('.m').textContent = `${first} — and ${++extra} more since`;
      return;
    }
    first = what; extra = 0;
    bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:min(420px,calc(100vw - 32px));display:flex;align-items:flex-start;gap:10px;background:var(--ox,#7A2E2B);color:#F2ECDF;font:13px/1.45 var(--sans,system-ui);padding:10px 12px;border-radius:10px;box-shadow:0 6px 18px -6px rgba(0,0,0,.4);z-index:60';
    const m = document.createElement('span'); m.className = 'm'; m.textContent = what;
    const x = document.createElement('button');
    x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Dismiss');
    x.style.cssText = 'font:inherit;font-size:16px;line-height:1;color:inherit;background:none;border:0;padding:0 2px;cursor:pointer;opacity:.8';
    x.addEventListener('click', () => { bar.remove(); bar = null; extra = 0; });   // dismissed: the next fault starts fresh
    bar.append(m, x);
    (document.body || document.documentElement).appendChild(bar);
  }
  // A view transition that gives up is not a fault: the navigation happened, the page works, all that was lost
  // is the crossfade. The browser rejects its own promise to say so, which arrives here as an unhandled
  // rejection. Saying it out loud would fill the one place HQ admits to being broken with something nobody can
  // act on — but discarding it throws away the evidence of why it aborts. So it is written down and kept quiet:
  // marked soft, left out of the notice and out of the bell, and still there in hqOops.list().
  const cosmetic = (name, what) => name === 'AbortError'
    || /transition was abort|view ?transition|skipped the view transition/i.test(what);

  function note(what, where, soft) {
    try {
      const l = read(), last = l[l.length - 1], now = new Date().toISOString(), p = page();
      // the same thing failing in a loop is one fault, counted — not twenty lines of the same sentence
      if (last && last.what === what && last.page === p) { last.n = (last.n || 1) + 1; last.at = now; }
      else l.push({ what, where, page: p, at: now, n: 1, ...(soft ? { soft: true } : {}) });
      write(l);
      if (!soft) show(`Something on ${p === 'index' ? 'the welcome page' : p} went wrong — ${what}`);
    } catch {}                                            // a reporter that throws is worse than no reporter
  }
  addEventListener('error', e => {
    if (e && e.target && e.target.tagName && !e.message) return;        // a picture or script that would not load, not a throw
    const msg = String((e && e.message) || '');
    if (!msg || (msg === 'Script error.' && !e.filename)) return;       // another origin's script: there is nothing to report
    note(msg, e.filename ? `${String(e.filename).split('/').pop()}:${e.lineno}` : '', cosmetic((e.error && e.error.name) || '', msg));
  });
  // an await that rejected with nobody to catch it: the commonest way a page half-draws
  addEventListener('unhandledrejection', e => {
    const r = e && e.reason, what = String((r && r.message) || r || 'A promise was rejected with no reason given');
    note(what, '', cosmetic((r && r.name) || '', what));
  });
})();

(function () {
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem('hq.' + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem('hq.' + k, JSON.stringify(v)); } catch {} },
  };
  // Which cached documents hold an edit the server has not confirmed. Without this the cache was treated as a
  // second source of truth: any document the server did not have was served from, and pushed back up from,
  // whatever this browser happened to keep. A phone that had opened HQ every day for months therefore went on
  // showing every day's to-do list it had ever cached — and resurrecting them on the server — while a second
  // device, with a different cache, showed none of them. The server is the truth. The cache is a cache, with
  // the one exception of an edit that has not managed to leave yet.
  const DIRTY = 'hq!unsent';
  const dirty = {
    all: () => { try { return JSON.parse(localStorage.getItem(DIRTY)) || {}; } catch { return {}; } },
    has: k => k in dirty.all(),
    add: k => { try { const d = dirty.all(); if (d[k]) return; d[k] = 1; localStorage.setItem(DIRTY, JSON.stringify(d)); } catch {} },
    drop: k => { try { const d = dirty.all(); if (!(k in d)) return; delete d[k]; localStorage.setItem(DIRTY, JSON.stringify(d)); } catch {} },
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
      if (doc && doc.data !== undefined) { ls.set(key, doc.data); seen[key] = doc.updated_at; dirty.drop(key); out = doc.data; }
      else if (!docs) { /* the server did not answer: the cache is all there is, and is not written back */ }
      else if (cached && dirty.has(key)) { loaded[key] = true; save(key, cached); }   // an edit that never reached the server
      else out = null;                     // the server answered and has no such document, so neither have we
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
  // One quiet line at the foot of the page, for the two things the pages cannot show on their own: that what
  // you are reading is a kept copy, and that what you have written has not left yet. The second matters more,
  // so it is the one said — an edit you cannot tell apart from a lost one is the worst state to leave someone in.
  let note, noteText = null;
  function pill(text) {
    if (text === noteText) return;
    noteText = text;
    if (!text) { if (note) { note.remove(); note = null; } return; }
    if (!note) {
      note = document.createElement('div');
      note.setAttribute('role', 'status');   // it appears without focus moving, so it must say itself
      note.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:calc(100vw - 40px);text-align:center;background:var(--band,#1F3A2E);color:var(--band-ink,#F2ECDF);font:13px/1.4 var(--sans,system-ui);padding:9px 16px;border-radius:999px;opacity:.92;z-index:50;pointer-events:none';
      document.body.appendChild(note);
    }
    note.textContent = text;
  }
  // coming back on to the network is what sends a waiting edit: the reload runs flush, which pushes it
  let watchingOnline = false;
  const onlineReloads = () => { if (watchingOnline) return; watchingOnline = true; addEventListener('online', () => location.reload(), { once: true }); };

  let isOffline = false, isUnsent = false;
  const tell = () => pill(
    isUnsent ? 'Saved here — not sent yet. It will go when you are back.'
    : isOffline ? 'Offline — showing your last copy.' : null);

  // with no network the pages still open on their last copy; say so quietly rather than let it look live
  function offline(on) {
    isOffline = on && !navigator.onLine;
    if (isOffline) onlineReloads();
    tell();
  }
  // an edit that could not reach the server. It is in localStorage and marked unsent, so a later load pushes it;
  // the one thing that must not happen is for it to look saved when it is only saved here.
  function unsent(on) { isUnsent = on; if (on) onlineReloads(); tell(); }

  function save(key, doc) {
    if (!loaded[key]) return;                  // still waiting on the server: nothing to save yet
    ls.set(key, doc); dirty.add(key);           // unsent until the server says otherwise
    clearTimeout(timers[key]); pending[key] = doc;
    timers[key] = setTimeout(() => put(key), 400);   // debounced; a stale base comes back as a conflict
  }
  async function put(key, keepalive = false) {
    const doc = pending[key]; if (doc === undefined) return; delete pending[key]; clearTimeout(timers[key]);
    try {
      const headers = { 'content-type': 'application/json' }; if (seen[key]) headers['x-hq-base'] = seen[key];
      const r = await fetch(`/api/state?key=${encodeURIComponent(key)}`, { method: 'PUT', headers, body: JSON.stringify(doc), keepalive });
      if (r.status === 409) { const cur = await r.json(); ls.set(key, cur.data); seen[key] = cur.updated_at; dirty.drop(key); changedElsewhere(); return; }
      if (r.ok) { dirty.drop(key); const j = await r.json().catch(() => ({})); if (j.updated_at) seen[key] = j.updated_at;
        if (!Object.keys(dirty.all()).length) unsent(false); }                       // the queue is empty again: stop saying it is not
      else unsent(true);                        // a refusal is as unsent as a dropped connection — the server answered, but not yes
    } catch { unsent(true); }                   // it stays in the cache, marked, for the next load to push
  }
  // another device wrote this document since the page loaded: take the newer copy and start again from it
  let told = false;
  function changedElsewhere() {
    if (told) return; told = true;
    const t = document.createElement('div');
    t.setAttribute('role', 'alert');        // the page is about to reload under them; this one interrupts
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
