// Needs no environment of its own: it sets DATABASE_URL below, because the route it imports builds a
// database client at import time even though nothing here ever queries one.
// Calendar → Google: what gets sent, what is left alone, and what stops the two directions duplicating.
import assert from 'node:assert';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client the moment it is imported; the logic under test never queries
const { bodyFor, fingerprint, pushCalendar, needsPush } = await import('../api/sync/_calpush.js');

// a one-off keeps its hours and carries no recurrence
{
  const b = bodyFor({ title: 'Call with advisor', date: '2026-09-15', start: 11, end: 11.5, sub: 'quarterly' }, 'Appointments');
  assert.equal(b.summary, 'Call with advisor');
  assert.equal(b.start.dateTime, '2026-09-15T11:00:00');
  assert.equal(b.end.dateTime, '2026-09-15T11:30:00');
  assert.ok(!b.recurrence, 'a one-off should carry no rule');
  assert.ok(b.description.includes('quarterly') && b.description.includes('HQ'));
}

// a weekly entry becomes one event with a rule, not one event a week
{
  const b = bodyFor({ title: 'Study', date: '2026-09-15', start: 9, end: 10.5, rep: [0, 2, 4] }, 'Study');   // 2026-09-15 is a Tuesday
  assert.deepEqual(b.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,FR']);
  assert.equal(b.start.dateTime, '2026-09-15T09:00:00');
  assert.equal(b.end.dateTime, '2026-09-15T10:30:00');
}

// quarter hours survive, and an end before the start does not make a negative event
assert.equal(bodyFor({ date: '2026-09-15', start: 8.25, end: 8.75 }).start.dateTime, '2026-09-15T08:15:00');
assert.equal(bodyFor({ date: '2026-09-15', start: 14, end: 13 }).end.dateTime, '2026-09-15T14:00:00');

// the fingerprint changes when the entry does, and only then
{
  const s = { title: 'Gym', date: '2026-09-15', start: 17, end: 18, rep: [] };
  const a = fingerprint(s, 'Training');
  assert.equal(a, fingerprint({ ...s }, 'Training'), 'an unchanged entry must not be sent again');
  assert.notEqual(a, fingerprint({ ...s, start: 18, end: 19 }, 'Training'), 'a moved entry must be sent');
  assert.notEqual(a, fingerprint({ ...s, title: 'Gym — pull day' }, 'Training'), 'a renamed entry must be sent');
  assert.notEqual(a, fingerprint(s, 'Appointments'), 'a recategorised entry must be sent');
}

// ---- the whole run, against a Google that is only pretending ----
function pretend(){
  const events = new Map(); let next = 1; const log = [];
  return { events, log, api: {
    add: async b => { const id = 'g' + next++; events.set(id, b); log.push('add ' + b.summary); return { id }; },
    change: async (id, b) => { log.push('change ' + b.summary); if(!events.has(id)) return { gone: true }; events.set(id, b); return { ok: true }; },
    remove: async id => { log.push('remove ' + id); const had = events.delete(id); return had ? { ok: true } : { gone: true }; },
  } };
}

const cats = [{ id: 'cal', name: 'Appointments' }, { id: 'fit', name: 'Training' }];

// 1. an entry made here is written there; one that came from Google is not
{
  const cal = { cats, series: [
    { id: 1, title: 'Dentist', date: '2026-09-16', start: 9, end: 10, cat: 'cal' },
    { id: 'google:abc', source: 'google', title: 'Standup', date: '2026-09-16', start: 9.5, end: 9.75, cat: 'cal' },
  ] };
  const g = pretend();
  const out = await pushCalendar(cal, g.api);
  assert.deepEqual([out.added, out.changed, out.removed], [1, 0, 0]);
  assert.equal(g.events.size, 1, 'only the entry HQ made should have been written');
  assert.deepEqual(g.log, ['add Dentist']);
  assert.ok(cal.series[0].gid && cal.series[0].pushed, 'the entry must remember what Google called it');
  assert.ok(!cal.series[1].gid, 'a Google entry must not be touched');

  // 2. running again with nothing changed says nothing
  const again = await pushCalendar(cal, g.api);
  assert.deepEqual([again.added, again.changed, again.removed], [0, 0, 0]);
  assert.equal(needsPush(cal), false, 'an unchanged calendar should not even ask');
  assert.deepEqual(g.log, ['add Dentist'], 'nothing more should have been sent');

  // 3. moving it sends a change, once
  cal.series[0].start = 14; cal.series[0].end = 15;
  assert.equal(needsPush(cal), true);
  const moved = await pushCalendar(cal, g.api);
  assert.deepEqual([moved.added, moved.changed, moved.removed], [0, 1, 0]);
  assert.equal(g.events.get(cal.series[0].gid).start.dateTime, '2026-09-16T14:00:00');
  assert.deepEqual(await pushCalendar(cal, g.api).then(r => [r.added, r.changed]), [0, 0]);

  // 4. removing it here removes it there
  const gid = cal.series[0].gid;
  cal.dropped = [gid]; cal.series = cal.series.filter(s => s.id !== 1);
  const gone = await pushCalendar(cal, g.api);
  assert.deepEqual([gone.added, gone.changed, gone.removed], [0, 0, 1]);
  assert.equal(g.events.size, 0);
  assert.deepEqual(cal.dropped, [], 'a confirmed removal should not be remembered');
}

// 5. an event deleted in Google is noticed and made again
{
  const cal = { cats, series: [{ id: 2, title: 'Gym', date: '2026-09-16', start: 17, end: 18, cat: 'fit' }] };
  const g = pretend();
  await pushCalendar(cal, g.api);
  g.events.clear();                                  // someone deleted it on the Google side
  cal.series[0].title = 'Gym — pull day';
  const out = await pushCalendar(cal, g.api);
  assert.ok(/gone from Google/.test(out.errors || ''), 'it should say what happened');
  assert.ok(!cal.series[0].gid, 'the stale id must be let go');
  const back = await pushCalendar(cal, g.api);
  assert.equal(back.added, 1, 'and the entry should be put back');
  assert.equal([...g.events.values()][0].summary, 'Gym — pull day');
}

// 6. a refusal is reported and nothing is quietly marked as sent
{
  const cal = { cats, series: [{ id: 3, title: 'Call', date: '2026-09-16', start: 11, end: 12, cat: 'cal' }] };
  const out = await pushCalendar(cal, { add: async () => ({ error: 'Google said 403' }), change: async () => ({ ok: true }), remove: async () => ({ ok: true }) });
  assert.equal(out.added, 0);
  assert.ok(/403/.test(out.errors));
  assert.ok(!cal.series[0].gid && !cal.series[0].pushed, 'a failed push must not look like a successful one');
  assert.equal(needsPush(cal), true, 'and it must still want sending');
}

console.log('calpush: writes only its own entries, sends each change once, removes on request, and recovers from a deletion made elsewhere');
