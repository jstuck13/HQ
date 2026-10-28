// store.js's one rule: the server is the truth and localStorage is a cache. The exception — an edit that has
// not managed to leave this browser yet — is the only reason a cached document may be served or pushed when the
// server says it has none. Get that wrong and a device that has opened HQ every day for months serves, and
// resurrects, every day it ever cached, while another device shows none of them.
import { readFileSync } from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert';

const wait = ms => new Promise(r => setTimeout(r, ms));
const STAMP = '2026-10-05T00:00:00.000Z';

// enough of an element to let the error notice build itself
const el = tag => ({ tag, style: {}, children: [], attrs: {}, textContent: '', className: '',
  setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, remove() {},
  append(...n) { this.children.push(...n); },
  querySelector(sel) { return this.children.find(c => '.' + c.className === sel) || null; } });

function room({ answers = true, server = {}, cache = {}, unsent = [], host = 'hq-six-puce.vercel.app', search = '' }) {
  const went = [], handlers = {}, body = [];
  const mem = new Map();
  for (const [k, v] of Object.entries(cache)) mem.set('hq.' + k, JSON.stringify(v));
  if (unsent.length) mem.set('hq!unsent', JSON.stringify(Object.fromEntries(unsent.map(k => [k, 1]))));
  const puts = [];
  const sandbox = {
    localStorage: { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) },
    fetch: async (url, init) => {
      const u = String(url);
      if (init && init.method === 'PUT') { puts.push(decodeURIComponent(u.split('key=')[1])); return { ok: true, status: 200, json: async () => ({ updated_at: STAMP }) }; }
      if (!answers) throw new Error('offline');
      const keys = decodeURIComponent(u.split('keys=')[1]).split(',');
      const out = {};
      for (const k of keys) out[k] = k in server ? { data: server[k], updated_at: STAMP } : null;
      return { ok: true, status: 200, json: async () => out };
    },
    document: { addEventListener() {}, createElement: tag => el(tag), body: { appendChild: n => body.push(n) }, visibilityState: 'visible' },
    navigator: { onLine: true },
    location: { reload() {}, hostname: host, protocol: 'https:', pathname: '/list.html', search, hash: '', replace: u => went.push(u) },
    addEventListener: (t, f) => { (handlers[t] ||= []).push(f); }, setTimeout, clearTimeout, Date, JSON, encodeURIComponent, decodeURIComponent, console,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync('store.js', 'utf8'), sandbox);
  return { store: sandbox.store, puts, went,
    unsentNow: () => { try { return JSON.parse(mem.get('hq!unsent')) || {}; } catch { return {}; } },
    fire: (t, ev) => (handlers[t] || []).forEach(f => f(ev)),
    oops: () => { try { return JSON.parse(mem.get('hq!oops')) || []; } catch { return []; } },
    shown: () => { const b = body[0]; const m = b && b.querySelector('.m'); return m ? m.textContent : null; } };
}

// A deployment's one-off hostname is a different origin: its own cookie jar, its own localStorage. Landing
// there is what makes one device ask for the passcode again and show a directory nobody arranged.
{
  assert.deepEqual(room({ host: 'hq-8yuvep867-rocket-premier-league.vercel.app' }).went,
    ['https://hq-six-puce.vercel.app/list.html'], 'a deployment host hands you to the real address, path kept');
  assert.deepEqual(room({}).went, [], 'the real address stays put');
  assert.deepEqual(room({ host: 'hq-abc123.vercel.app', search: '?stay' }).went, [], '?stay is the way to look at a preview on purpose');
  assert.deepEqual(room({ host: 'localhost' }).went, [], 'and nothing local is ever sent anywhere');
}

// the ordinary read: the server's copy, and nothing written back
{
  const r = room({ server: { 'today.2026-10-06': { items: [{ text: 'cadence practice' }] } } });
  assert.deepEqual(await r.store.load('today.2026-10-06'), { items: [{ text: 'cadence practice' }] });
  await wait(600);
  assert.deepEqual(r.puts, [], 'reading a document writes nothing');
}

// the server answered and has no such day: this browser's old copy is not a second opinion
{
  const r = room({ server: {}, cache: { 'today.2026-07-12': { items: [{ text: 'something from July' }] } } });
  assert.equal(await r.store.load('today.2026-07-12'), null, 'a day the server does not have stays gone');
  await wait(600);
  assert.deepEqual(r.puts, [], 'and is not pushed back up from the cupboard');
}

// an edit that never managed to leave is still recovered, and sent
{
  const r = room({ server: {}, cache: { 'today.2026-10-06': { items: [{ text: 'typed on a train' }] } }, unsent: ['today.2026-10-06'] });
  assert.deepEqual(await r.store.load('today.2026-10-06'), { items: [{ text: 'typed on a train' }] }, 'unsent work is kept');
  await wait(600);
  assert.deepEqual(r.puts, ['today.2026-10-06'], 'and goes up now there is a server to take it');
}

// with no answer from the server the last copy still opens the page, and is not written back
{
  const r = room({ answers: false, cache: { health: { days: {} } } });
  assert.deepEqual(await r.store.load('health'), { days: {} }, 'offline, the last copy opens the page');
  await wait(600);
  assert.deepEqual(r.puts, [], 'and nothing is pushed on a guess');
}

// a save is unsent until the server says otherwise
{
  const r = room({ server: { school: { items: [] } } });
  await r.store.load('school');
  r.store.save('school', { items: [{ id: 1 }] });
  assert.ok(r.unsentNow().school, 'unsent while it waits in the debounce');
  await wait(700);
  assert.deepEqual(r.puts, ['school'], 'then sent');
  assert.ok(!r.unsentNow().school, 'and no longer unsent once the server has it');
}

// ---- a page that breaks says so, and the last few are kept ----
// Every fault this project has had was found by eye, because a render that threw said nothing at all.
{
  const r = room({});
  r.fire('error', { message: 'Cannot read properties of null', filename: 'https://hq.test/today.html', lineno: 412 });
  let l = r.oops();
  assert.equal(l.length, 1, 'a throw is written down');
  assert.equal(l[0].what, 'Cannot read properties of null');
  assert.equal(l[0].where, 'today.html:412', 'with the file and line that threw');
  assert.equal(l[0].page, 'list', 'and the page it happened on');
  assert.match(r.shown(), /Something on list went wrong . Cannot read properties of null/, 'and it is said out loud');

  // the same thing failing in a loop is one fault, counted — not twenty copies of one sentence
  r.fire('error', { message: 'Cannot read properties of null', filename: 'https://hq.test/today.html', lineno: 412 });
  l = r.oops();
  assert.equal(l.length, 1, 'the same fault twice is still one line');
  assert.equal(l[0].n, 2, 'counted');

  assert.match(r.shown(), /Cannot read properties of null$/, 'and saying it twice adds nothing to the notice');

  // an await that rejected with nobody to catch it: the commonest way a page half-draws
  r.fire('unhandledrejection', { reason: new Error('500 from /api/state') });
  l = r.oops();
  assert.equal(l.length, 2);
  assert.equal(l[1].what, '500 from /api/state');
  // a render that breaks takes things down with it; the first message is the one that explains the rest
  assert.match(r.shown(), /Cannot read properties of null . and 1 more since/, 'the cause is kept, the rest counted');

  // things that are not a page breaking are not reported
  r.fire('error', { target: { tagName: 'IMG' } });                    // a picture that would not load
  r.fire('error', { message: 'Script error.' });                      // another origin's script, no detail
  r.fire('error', {});
  assert.equal(r.oops().length, 2, 'none of those three is a fault to report');

  // nor is a view transition giving up: the navigation happened, the page works, only the crossfade was lost
  r.fire('unhandledrejection', { reason: Object.assign(new Error('Transition was aborted because of invalid state'), { name: 'AbortError' }) });
  r.fire('unhandledrejection', { reason: new Error('Transition was aborted because of invalid state. ViewTransition opt-in') });
  r.fire('error', { message: 'Skipped the view transition', filename: 'x.js', lineno: 1 });
  assert.equal(r.oops().length, 5, 'they are still written down — the evidence of why is the point');
  assert.ok(r.oops().slice(2).every(x => x.soft), 'but marked soft, so the bell leaves them alone too');
  assert.match(r.shown(), /Cannot read properties of null/, 'and the notice never mentions them');

  assert.equal(typeof r.store, 'object', 'and the data door still opened despite all of that');
}

// the log is a ring: twenty at most, so a page failing all day cannot fill the browser's store
{
  const r = room({});
  for (let i = 0; i < 30; i++) r.fire('error', { message: 'fault number ' + i, filename: 'x.js', lineno: i });
  const l = r.oops();
  assert.equal(l.length, 20, 'only the last twenty are kept');
  assert.equal(l[19].what, 'fault number 29', 'and the newest is the last');
}

console.log('store.js: all checks passed');
