// The syncs are the only code in HQ that deletes your data without being asked, and they had no tests at all.
// The questions that matter are not "does it work when everything answers" — it is what happens when the other
// end answers with an error, with nothing, or leaves a field out. A sync cannot tell "this was deleted over
// there" apart from "I could not see it", and every destructive bug found so far has lived in that gap:
// a reconnected Google account that refused to list calendars, and a Canvas course that came back without
// its enrolment. So each source is run here against an API that is made to answer badly on purpose.
import { test } from 'node:test';
import assert from 'node:assert';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; it is never used
process.env.GOOGLE_CLIENT_ID = 'id'; process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.CANVAS_URL = 'https://canvas.test'; process.env.CANVAS_TOKEN = 'tok';

const google = (await import('../api/sync/_google.js')).default;
const canvas = (await import('../api/sync/_canvas.js')).default;

// a stand-in for the other end of the wire: routes matched in order, each a function of the URL
function web(routes) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url); calls.push(u);
    for (const [match, reply] of routes) {
      if (!u.includes(match)) continue;
      const r = typeof reply === 'function' ? reply(u, init) : reply;
      return {
        ok: r.status === undefined || (r.status >= 200 && r.status < 300),
        status: r.status ?? 200,
        headers: { get: () => '' },                       // no rel="next": one page is enough here
        json: async () => r.body,
      };
    }
    throw new Error('nothing stubbed for ' + u);
  };
  return calls;
}
// documents in memory, so a sync can be run with no database
const docs = seed => { const m = new Map(Object.entries(seed));
  return { m, getDoc: async k => (m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : null),
           putDoc: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); } }; };

const TOKEN = ['oauth2.googleapis.com/token', { body: { access_token: 'at', scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events' } }];
// The sync only prunes inside the window it actually read — fourteen days back to ninety forward — so these days
// are counted from today rather than written down. Fixed dates passed when they were typed and then quietly
// stopped: once the window had moved past them the cancelled event was outside it, nothing was pruned, and the
// test that was meant to prove pruning works was proving nothing. A fixture with a date in it rots.
const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const D0 = day(1), D1 = day(2), D2 = day(3);

const twoEvents = [
  { id: 'a', status: 'confirmed', summary: 'Standing meeting', start: { date: D0 }, end: { date: D0 } },
  { id: 'b', status: 'confirmed', summary: 'Dentist', start: { date: D1 }, end: { date: D1 } },
];
// a calendar as it stands before a sync: two entries from Google, one typed into HQ itself
const calSeed = () => ({ calendar: {
  cats: [{ id: 'cal', name: 'Appointments', tint: '#E9EEF3' }], series: [
    { id: 'google:a', title: 'Standing meeting', date: D0, start: 8, end: 8.5, source: 'google', cat: 'cal' },
    { id: 'google:b', title: 'Dentist', date: D1, start: 8, end: 8.5, source: 'google', cat: 'cal' },
    { id: 'mine', title: 'Pay the rent', date: D2, start: 9, end: 10, cat: 'cal' },
  ], notes: {}, hidden: [] } });

// ---- Google ----

test('Google: a refused calendar list deletes nothing, and says what Google said', async () => {
  const d = docs({ _google: { refresh_token: 'r', scope: 'https://www.googleapis.com/auth/calendar.events' }, ...calSeed() });
  web([TOKEN, ['calendarList', { status: 403, body: { error: { message: 'Request had insufficient authentication scopes.' } } }]]);
  await assert.rejects(google.run(d), e => {
    assert.match(e.message, /insufficient authentication scopes/, 'Google’s own words, not a guess');
    assert.match(e.message, /reconnect/i, 'and what to do about it');
    return true;
  });
  assert.equal(d.m.get('calendar').series.length, 3, 'nothing was removed on a refusal');
});

test('Google: an empty calendar list deletes nothing', async () => {
  const d = docs({ _google: { refresh_token: 'r' }, ...calSeed() });
  web([TOKEN, ['calendarList', { body: { items: [] } }]]);
  await assert.rejects(google.run(d), /none could be read from|no calendars/i);
  assert.equal(d.m.get('calendar').series.length, 3, 'an account that lists nothing is not an emptied calendar');
});

test('Google: one calendar of two failing deletes nothing', async () => {
  const d = docs({ _google: { refresh_token: 'r' }, ...calSeed() });
  web([TOKEN,
    ['calendarList', { body: { items: [{ id: 'one', primary: true, accessRole: 'owner' }, { id: 'two', summary: 'Shared', accessRole: 'owner' }] } }],
    ['calendars/one/events', { body: { items: twoEvents } }],
    ['calendars/two/events', { status: 500, body: {} }],
  ]);
  await assert.rejects(google.run(d), /1 of 2 calendars did not answer/);
  assert.equal(d.m.get('calendar').series.length, 3, 'a half-read account prunes nothing');
});

test('Google: when every calendar answers, what really went is removed', async () => {
  const d = docs({ _google: { refresh_token: 'r' }, ...calSeed() });
  web([TOKEN,
    ['calendarList', { body: { items: [{ id: 'one', primary: true, accessRole: 'owner' }] } }],
    ['calendars/one/events', { body: { items: [twoEvents[0]] } }],   // the dentist really was cancelled
  ]);
  const out = await google.run(d);
  const series = d.m.get('calendar').series;
  assert.equal(out.removed, 1, 'a complete read may still prune');
  assert.ok(!series.some(s => s.id === 'google:b'), 'the cancelled event is gone');
  assert.ok(series.some(s => s.id === 'google:a'), 'the one still there stays');
  assert.ok(series.some(s => s.id === 'mine'), 'and what you typed yourself is never touched');
});

// ---- Canvas ----

const course = extra => ({ id: 7, name: 'Physics II', course_code: 'PHYS-2', ...extra });
const schoolSeed = () => ({ school: {
  courses: [{ id: 'canvas:7', name: 'PHYS-2', conf: 3, source: 'canvas', links: [],
              mark: { pct: 91.5, letter: 'A-', at: '2026-10-01' }, marks: [{ d: '2026-10-01', pct: 91.5 }] }],
  items: [], sessions: [], ignored: [] } });

test('Canvas: a course that comes back without its enrolment keeps the mark it had', async () => {
  const d = docs(schoolSeed());
  web([
    ['/api/v1/courses?', { body: [course({})] }],          // no `enrollments` at all — Canvas does this
    ['planner/items', { body: [] }],
  ]);
  await canvas.run(d);
  const c = d.m.get('school').courses[0];
  assert.ok(c.mark, 'a mark Canvas did not mention is not a mark Canvas withdrew');
  assert.equal(c.mark.pct, 91.5, 'and it is the mark that was there');
});

test('Canvas: a mark Canvas positively reports as gone is cleared', async () => {
  const d = docs(schoolSeed());
  web([
    ['/api/v1/courses?', { body: [course({ enrollments: [{ type: 'student', computed_current_score: null, computed_current_grade: null }] })] }],
    ['planner/items', { body: [] }],
  ]);
  await canvas.run(d);
  assert.equal(d.m.get('school').courses[0].mark, undefined, 'an enrolment that says there is no score is believed');
});

test('Canvas: a new mark replaces the old one and is remembered', async () => {
  const d = docs(schoolSeed());
  web([
    ['/api/v1/courses?', { body: [course({ enrollments: [{ type: 'student', computed_current_score: 88.2, computed_current_grade: 'B+' }] })] }],
    ['planner/items', { body: [] }],
  ]);
  await canvas.run(d);
  const c = d.m.get('school').courses[0];
  assert.equal(c.mark.pct, 88.2);
  assert.ok(c.marks.length >= 2, 'the history gains the new reading');
});

test('Canvas: a failed courses call changes nothing at all', async () => {
  const d = docs(schoolSeed());
  web([['/api/v1/courses?', { status: 401, body: {} }]]);
  await assert.rejects(canvas.run(d), /401/);
  assert.deepEqual(d.m.get('school'), schoolSeed().school, 'the document is untouched');
});

// the submissions pass is the other place Canvas writes over what is here; it behaves, and should keep behaving
const withItem = extra => ({ school: {
  courses: [{ id: 'canvas:7', name: 'PHYS-2', conf: 3, source: 'canvas', links: [] }],
  items: [{ id: 'canvas:assignment:55', course: 'canvas:7', source: 'canvas', title: 'Lab 3', due: '2026-10-02',
            score: 18, pts: 20, done: true, ...extra }],
  sessions: [], ignored: [] } });

test('Canvas: submissions failing for a course loses nothing, and is reported', async () => {
  const d = docs(withItem());
  web([
    ['/api/v1/courses?', { body: [course({ enrollments: [{ type: 'student', computed_current_score: 90 }] })] }],
    ['planner/items', { body: [] }],
    ['students/submissions', { status: 503, body: {} }],
  ]);
  const out = await canvas.run(d);
  assert.match(String(out.noGrades || ''), /503/, 'the failure is carried into the ledger, not swallowed');
  const it = d.m.get('school').items[0];
  assert.equal(it.score, 18, 'the mark already recorded survives');
  assert.equal(it.done, true);
});

test('Canvas: a hand-made no-hand-in choice is never overwritten', async () => {
  const d = docs(withItem({ byHand: true, noturn: true }));
  web([
    ['/api/v1/courses?', { body: [course({ enrollments: [{ type: 'student', computed_current_score: 90 }] })] }],
    ['planner/items', { body: [] }],
    ['students/submissions', { body: [{ assignment_id: 55, workflow_state: 'graded', score: 19,
        assignment: { id: 55, name: 'Lab 3', submission_types: ['online_upload'], points_possible: 20 } }] }],
  ]);
  await canvas.run(d);
  const it = d.m.get('school').items[0];
  assert.equal(it.noturn, true, 'Canvas saying it is handed in online does not undo what you decided');
  assert.equal(it.score, 19, 'the new score is still taken');
});

// ---- the word of the day, kept ----
// `daily` holds one day and is written over every night, so every word before today was lost. These two keep
// them, and recover what the nightly backup still has — which is only ever the last thirty days, so a mistake
// here is not a bug you can fix later, it is a word gone for good.
const { keepWord, foldBackups } = await import('../api/sync/_daily.js');
const word = w => ({ w, pr: '/x/', pos: 'adjective', def: 'The meaning of ' + w, ex: 'A sentence with ' + w + ' in it.' });

test('a word is kept once for its day, with everything a card needs', () => {
  const words = {};
  assert.equal(keepWord(words, '2026-10-13', word('halcyon')), true);
  assert.deepEqual(words.seen[0], { d: '2026-10-13', w: 'halcyon', pr: '/x/', pos: 'adjective',
    def: 'The meaning of halcyon', ex: 'A sentence with halcyon in it.' });
  assert.equal(keepWord(words, '2026-10-13', word('lacuna')), false, 'one word to a day');
  assert.equal(words.seen.length, 1);
  assert.equal(keepWord(words, '2026-10-12', word('lacuna')), true, 'an earlier day can still be filled in');
  assert.deepEqual(words.seen.map(x => x.d), ['2026-10-12', '2026-10-13'], 'and the deck stays in order');
  assert.equal(keepWord(words, '2026-10-14', null), false, 'a day with no word keeps nothing');
  assert.equal(keepWord(words, null, word('x')), false);
});

test('the backups give back the month they still hold, and nothing twice', () => {
  const words = { seen: [{ d: '2026-10-13', w: 'halcyon', def: 'already here' }] };
  const rows = [
    { day: '2026-10-11', daily: { date: '2026-10-11', word: word('sanguine') } },
    { day: '2026-10-12', daily: { date: '2026-10-12', word: word('lacuna') } },
    { day: '2026-10-13', daily: { date: '2026-10-13', word: word('halcyon') } },   // already in the deck
    { day: '2026-10-14', daily: { date: '2026-10-14', word: word('lacuna'), wordFrom: '2026-10-12' } },
    { day: '2026-10-15', daily: null },                                            // a day with no daily document
    { day: '2026-10-16', daily: { date: '2026-10-16' } },                          // a day the word never arrived
  ];
  assert.equal(foldBackups(words, rows), 2, 'two genuinely new words');
  assert.deepEqual(words.seen.map(x => x.d), ['2026-10-11', '2026-10-12', '2026-10-13']);
  assert.equal(words.seen.find(x => x.d === '2026-10-13').def, 'already here', 'what was there is not overwritten');
  assert.equal(foldBackups(words, rows), 0, 'running it again adds nothing');
  assert.equal(foldBackups({}, null), 0, 'and no backups at all is not an error');
});

test('the deck is bounded, and keeps the newest', () => {
  const words = { seen: [] };
  for (let i = 0; i < 1300; i++) keepWord(words, new Date(Date.UTC(2024, 0, 1) + i * 864e5).toISOString().slice(0, 10), word('w' + i));
  assert.equal(words.seen.length, 1200, 'years of room, but not unbounded');
  assert.equal(words.seen[words.seen.length - 1].w, 'w1299', 'the newest is the last');
});

// ---- the sync ledger, read aloud ----
// The morning push is the only thing that tells you a source has stopped working. It used to read the
// preferences before they were declared, so on exactly the mornings a source was failing it threw a
// ReferenceError and sent nothing at all — the one morning the notice mattered was the one it could not send.
// The reading is its own function now, which is both the fix and the only way to ask it these questions.
const { staleLines } = await import('../api/sync/_notify.js');

const DAY = 864e5;
const NOW = Date.parse('2026-10-28T13:00:00Z');
const ago = n => new Date(NOW - n * DAY).toISOString();

test('a failing source says so, in its own words', () => {
  const said = staleLines({ canvas: { last: ago(0), ok: false, error: 'enrolment missing' } }, NOW);
  assert.equal(said.length, 1);
  assert.match(said[0], /^Canvas is failing: enrolment missing/);
});

test('a failing source is named even when it ran a moment ago', () => {
  // ok:false is the point, not the age — this is the case that used to throw
  assert.equal(staleLines({ google: { last: ago(0), ok: false } }, NOW).length, 1);
});

test('a source that ran today is not news', () => {
  assert.deepEqual(staleLines({ canvas: { last: ago(0), ok: true } }, NOW), []);
  assert.deepEqual(staleLines({ canvas: { last: ago(1), ok: true } }, NOW), []);
});

test('two days of silence is worth saying', () => {
  const said = staleLines({ garmin: { last: ago(3), ok: true } }, NOW);
  assert.deepEqual(said, ['Garmin has not run in 3 days.']);
});

test('a source that has never run is not a fault', () => {
  assert.deepEqual(staleLines({ bills: { ok: true } }, NOW), []);
  assert.deepEqual(staleLines({}, NOW), []);
  assert.deepEqual(staleLines(null, NOW), []);
});

test('an unknown key in the ledger is ignored, not announced', () => {
  assert.deepEqual(staleLines({ somethingNew: { last: ago(9), ok: false } }, NOW), []);
});

test('a long error is cut rather than filling the notice', () => {
  const said = staleLines({ canvas: { last: ago(0), ok: false, error: 'x'.repeat(200) } }, NOW);
  assert.ok(said[0].length < 90, said[0].length + ' characters is too long for a push');
});
