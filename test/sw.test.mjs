// exercise sw.js's fetch routing against a fake Cache/fetch, so the rules are checked without a browser
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert';
const store = new Map(); let network = true, netHits = [];
const key = req => (typeof req === 'string' ? req : req.url).split('?')[0].replace('http://hq.test', '');
const cache = {
  addAll: async us => us.forEach(u => store.set(key(u), 'precached ' + u)),
  match: async (r) => store.get(key(r)),
  put: async (r, body) => store.set(key(r), body),
  keys: async () => [...store.keys()].map(u => ({ url: 'http://hq.test' + u })),
};
const handlers = {};
const sandbox = {
  self: {
    addEventListener: (t, f) => (handlers[t] = f), skipWaiting: () => {}, clients: { claim: () => {} },
    location: { origin: 'http://hq.test' }, registration: {},
  },
  caches: { open: async () => cache, keys: async () => ['hq-shell-2', 'old'], delete: async () => true },
  fetch: async req => { netHits.push(key(req)); if (!network) throw new Error('offline'); return { ok: true, type: 'basic', clone: () => 'fresh ' + key(req) }; },
  URL, console,
};
vm.createContext(sandbox);
vm.runInContext(readFileSync('sw.js', 'utf8'), sandbox);

const run = async url => { let out; await handlers.fetch({ request: { method: 'GET', url }, respondWith: p => (out = p) }); return out ? await out : '(passed through)'; };
const install = async () => { let p; await handlers.install({ waitUntil: x => (p = x) }); await p; };

await install();
assert.ok(store.has('/study.html') && store.has('/hq.css') && store.has('/paths/socrates.json'), 'shell precached');
assert.equal(store.size, 36, 'every shell file cached, got ' + store.size);   // grew with restore.html, span.html, digest.js, capture.js and colophon.html

// A page, a script and a stylesheet come from the network when there is one, so a deploy is in your hands on
// this open. A kept today.html goes on reading the to-do list last week's way — and writing that back.
for (const p of ['/today.html', '/capture.js', '/hq.css']) {
  netHits = [];
  const r = await run('http://hq.test' + p);
  assert.ok(r && r.ok, p + ' came from the network, not the cupboard');
  assert.deepEqual(netHits, [p], p + ' asked of the network');
  assert.equal(store.get(p), 'fresh ' + p, p + ' kept copy brought up to date');
}

// a picture is served from what is kept, and refreshed behind you: staleness there costs nothing
netHits = [];
assert.equal(await run('http://hq.test/icon-192.png'), 'precached /icon-192.png', 'served from cache');
await new Promise(r => setTimeout(r, 10));
assert.deepEqual(netHits, ['/icon-192.png'], 'and revalidated');
assert.equal(store.get('/icon-192.png'), 'fresh /icon-192.png', 'cache updated behind the page');

// data is never cached
assert.equal(await run('http://hq.test/api/state?keys=health'), '(passed through)', 'api untouched');
assert.equal(await run('http://hq.test/sw.js'), '(passed through)', 'sw itself untouched');
assert.equal(await run('https://elsewhere.test/x.js'), '(passed through)', 'other origins untouched');
assert.ok(!store.has('/api/state'), 'no api response in the cache');

// with no network the kept page answers after all, and an uncached one does not pretend to
network = false;
assert.equal(await run('http://hq.test/today.html'), 'fresh /today.html', 'page opens offline from what was kept');
await assert.rejects(run('http://hq.test/nothing.html'), /offline/, 'uncached miss offline falls through to the network error');

// a new version clears the old cache
let p; await handlers.activate({ waitUntil: x => (p = x) }); await p;
console.log('sw.js: all checks passed');
