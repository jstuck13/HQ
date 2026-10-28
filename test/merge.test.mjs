// The bug this guards: a sync reads the calendar, works for a few seconds, and writes its copy back —
// carrying away anything saved on the page in the meantime. Both syncs must write onto what is current.
import assert from 'node:assert';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client the moment it is imported; the logic under test never queries

// stand in for the database: a document that someone else edits mid-run
function db(initial) {
  let doc = structuredClone(initial), writes = 0;
  return {
    get: async k => (k === 'calendar' ? structuredClone(doc) : null),
    put: async (k, v) => { if (k === 'calendar') { doc = structuredClone(v); writes++; } },
    edit: f => { f(doc); },
    read: () => doc,
    writes: () => writes,
  };
}

const googleEntry = (n, date) => ({ id: `google:${n}`, source: 'google', title: `From Google ${n}`, date, start: 9, end: 10, cat: 'cal' });

// ---- the push ----
{
  const { pushCalendar } = await import('../api/sync/_calpush.js');
  const store = db({ cats: [{ id: 'cal', name: 'Appointments' }], series: [googleEntry(1, '2026-09-20')], notes: {}, dropped: [] });

  // a run begins with the document as it is now
  const working = await store.get('calendar');
  working.series.push({ id: 7, title: 'Dentist', date: '2026-09-21', start: 9, end: 10, cat: 'cal' });

  // while it is away, the page saves an entry of its own
  store.edit(d => { d.series.push({ id: 8, title: 'Added while the sync was running', date: '2026-09-22', start: 14, end: 15, cat: 'cal' }); });

  const out = await pushCalendar(working, {
    add: async () => ({ id: 'gNEW' }), change: async () => ({ ok: true }), remove: async () => ({ ok: true }),
  });
  assert.equal(out.added, 1);

  // the route's merge: marks from the run, applied to what the document is now
  const fresh = await store.get('calendar');
  const marks = new Map(working.series.filter(s => s.gid || s.pushed).map(s => [s.id, { gid: s.gid, pushed: s.pushed }]));
  for (const s of fresh.series) { const m = marks.get(s.id); if (m) Object.assign(s, m); }
  for (const s of working.series) if (!fresh.series.some(f => f.id === s.id)) fresh.series.push(s);
  await store.put('calendar', fresh);

  const end = store.read();
  assert.ok(end.series.some(s => s.id === 8), 'the entry saved during the run was carried away');
  assert.ok(end.series.find(s => s.id === 7)?.gid === 'gNEW', 'the pushed entry did not keep its Google id');
  console.log('merge: an entry saved while the push was running survives it');
}

// ---- the incoming sync ----
{
  const start = { cats: [{ id: 'cal', name: 'Appointments' }], series: [googleEntry(1, '2026-09-20'), googleEntry(2, '2026-09-21')], notes: {}, hidden: [], ignored: [] };
  const store = db(start);
  const working = await store.get('calendar');

  // Google says: one event changed, one is gone
  working.series = working.series.filter(s => s.id !== 'google:2');
  working.series[0].title = 'Renamed in Google';
  const added = 0, updated = 1, removed = 1;

  // meanwhile the page adds an entry and a note
  store.edit(d => { d.series.push({ id: 9, title: 'Mine', date: '2026-09-23', start: 8, end: 9, cat: 'cal' }); d.notes['9@2026-09-23'] = 'remember this'; });

  // the merge the route now performs
  if (added || updated || removed) {
    const fresh = await store.get('calendar');
    fresh.series = [...fresh.series.filter(s => s.source !== 'google'), ...working.series.filter(s => s.source === 'google')];
    await store.put('calendar', fresh);
  }

  const end = store.read();
  assert.ok(end.series.some(s => s.id === 9), 'the hand-made entry was lost to the Google sync');
  assert.equal(end.notes['9@2026-09-23'], 'remember this', 'the note went with it');
  assert.ok(!end.series.some(s => s.id === 'google:2'), 'an event gone from Google should still be removed');
  assert.equal(end.series.find(s => s.id === 'google:1').title, 'Renamed in Google', 'a renamed event should still be updated');
  console.log('merge: a Google sync updates its own events without touching yours');
}

// ---- and a run with nothing to report writes nothing at all ----
{
  const store = db({ cats: [], series: [googleEntry(1, '2026-09-20')], notes: {} });
  const added = 0, updated = 0, removed = 0;
  if (added || updated || removed) await store.put('calendar', {});
  assert.equal(store.writes(), 0, 'a quiet run still rewrote the document');
  console.log('merge: a run with no changes leaves the document alone, so nothing else is refused as out of date');
}
