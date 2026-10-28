// The all-in-one box, read in a bare room: no page, no documents but the ones handed over. Today and The List
// both run this same module, so a change that quietly stops reading "every other day" or strips the words out
// of "read 20 pages of Project Hail Mary" fails here before it reaches either page.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const NOW = new Date('2026-10-05T14:00:00');   // a Monday, mid-afternoon
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const TODAY = iso(NOW);

const clock = { now: NOW, today: TODAY, iso, addDays, fromISO: s => new Date(s + 'T12:00:00'),
  dayMonth: d => `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`,
  short: d => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.getDate()}`,
  daysBetween: (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5),
  // the real one, from clock.js: a stub that answers null would make every date test below meaningless
  parseDay: (t, now = NOW) => { t = String(t).trim(); if (!t) return iso(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const m = /^\d{1,2}$/.exec(t); if (m) return iso(new Date(now.getFullYear(), now.getMonth(), +m[0], 12));
    const d = new Date(`${t} ${now.getFullYear()}`); if (!isNaN(d)) return iso(d);
    return iso(now); } };

const recurSrc = readFileSync('recur.js', 'utf8');
const capSrc = readFileSync('capture.js', 'utf8');

// a room with no page in it: every element lookup comes back empty, so the box writes straight through and
// its own "made that" line goes nowhere
function room() {
  const saved = {};
  const store = { save: (k, v) => { saved[k] = JSON.parse(JSON.stringify(v)); }, load: async () => null, sync: () => {} };
  const win = { clock };   // recur.js reads window.clock, as clock.js sets it in a browser
  const doc = { getElementById: () => null };
  new Function('window', 'document', 'clock', 'store', 'esc', 'h12', recurSrc + '\n' + capSrc)(
    win, doc, clock, store, String, h => `${Math.floor(h) % 12 || 12}.${String(Math.round((h % 1) * 60)).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`);

  const T = { items: [] }, RULES = { rules: [] }, CAL = { cats: [], series: [] }, FIN = { cats: [], tx: [] }, H = { days: {} };
  const cap = win.hqCapture({
    todo: () => T, rules: () => RULES, cal: () => CAL, fin: () => FIN, health: () => H,
    saveTodo: () => store.save('today.' + TODAY, T), saveRules: () => store.save('todo.rules', RULES),
    saveCal: () => store.save('calendar', CAL), saveFin: () => store.save('finances', FIN),
    saveHealth: () => store.save('health', H), redraw: () => {},
  });
  return { cap, T, RULES, CAL, FIN, H, saved };
}

test('two cadences in one sentence, sharing the one deadline', async () => {
  const r = room();
  await r.cap.capture('to do, cadence hotspots on every day before 9 pm, rest of candences every other day');
  assert.equal(r.RULES.rules.length, 2, 'two standing to-dos, not one line of mush');
  const [a, b] = r.RULES.rules;
  assert.equal(a.text, 'cadence hotspots');
  assert.equal(a.rep, 'daily');
  assert.equal(b.text, 'rest of candences');
  assert.deepEqual(b.rep, { every: 2, from: TODAY }, 'every other day is a period, with a day it counts from');
  assert.equal(a.at, 21, 'the deadline said once belongs to both');
  assert.equal(b.at, 21);
  assert.equal(r.T.items.length, 2, 'both fall on today, which is day nought of the period');
});

test('a target is read without being cut out of the words', async () => {
  const r = room();
  await r.cap.capture('read 20 pages of Project Hail Mary every day until December');
  const rule = r.RULES.rules[0];
  assert.equal(rule.text, 'read 20 pages of Project Hail Mary', 'the phrase stays in the sentence');
  assert.deepEqual(rule.target, { n: 20, unit: 'pages' });
  assert.equal(rule.rep, 'daily');
  assert.equal(rule.until, '2026-12-31', 'a month named is the end of it');
});

test('a stretch of days becomes an end date', async () => {
  const r = room();
  await r.cap.capture('stretch every weekday for two weeks');
  assert.equal(r.RULES.rules[0].rep, 'weekdays');
  assert.equal(r.RULES.rules[0].until, iso(addDays(NOW, 14)));
});

test('money, a weight, and an appointment each go to their own page', async () => {
  const r = room();
  await r.cap.capture('12.40 lunch');
  assert.equal(r.FIN.tx[0].amt, 12.4);
  assert.equal(r.FIN.tx[0].what, 'Lunch');

  await r.cap.capture('173.2');
  assert.equal(r.H.days[TODAY].weight, '173.2');

  await r.cap.capture('Dentist Thursday 3-4');
  assert.equal(r.CAL.series[0].title, 'Dentist');
  assert.equal(r.CAL.series[0].start, 15);
  assert.equal(r.CAL.series[0].end, 16);
  assert.equal(r.CAL.series[0].date, '2026-10-08', 'the next Thursday');
  assert.equal(r.T.items.length, 0, 'none of those three is a to-do');
});

test('a deadline is still a to-do, however much else is in the line', async () => {
  const r = room();
  await r.cap.capture('Call the dentist by 3 pm');
  assert.equal(r.CAL.series.length, 0, 'by names a deadline, not an appointment');
  assert.equal(r.T.items[0].text, 'Call the dentist');
  assert.equal(r.T.items[0].at, 15);
});

test('a count is not a span of time', async () => {
  const r = room();
  await r.cap.capture('walk 5 to 10 km tomorrow');
  assert.equal(r.CAL.series.length, 0, 'five to ten kilometres is not three to ten o clock');
  assert.ok(r.saved['today.2026-10-06'], 'it waits in tomorrow’s list');
  assert.equal(r.saved['today.2026-10-06'].items[0].text, 'walk 5 to 10 km');
});

test('one standing to-do, one rule, however often it is asked for', async () => {
  const r = room();
  await r.cap.capture('cadence practice every day');
  await r.cap.capture('cadence practice every other day before 9 pm');
  assert.equal(r.RULES.rules.length, 1, 'asked again, the rule is told — not joined by a twin');
  assert.deepEqual(r.RULES.rules[0].rep, { every: 2, from: TODAY }, 'the new cadence wins');
  assert.equal(r.RULES.rules[0].at, 21);
  assert.equal(r.T.items.length, 1, 'and the day shows it once');
  assert.equal(r.T.items[0].at, 21, 'the day’s copy follows the rule');
});

test('twin rules already in the document are folded back together', async () => {
  const r = room();
  r.RULES.rules.push({ id: 'r1', text: 'cadence practice', rep: 'daily', log: { '2026-10-01': 1 } });
  r.RULES.rules.push({ id: 'r2', text: 'Cadence Practice', rep: 'daily', log: { '2026-10-02': 1 } });
  r.RULES.rules.push({ id: 'r3', text: 'cadence practice', rep: 'daily' });
  r.T.items.push({ text: 'cadence practice', done: false, rule: 'r1' });
  r.T.items.push({ text: 'cadence practice', done: true, did: 4, rule: 'r2' });
  r.T.items.push({ text: 'cadence practice', done: false, rule: 'r3' });
  r.T.skipped = ['r3'];

  assert.equal(r.cap.fold(), 2, 'two of the three were twins');
  assert.equal(r.RULES.rules.length, 1);
  assert.equal(r.RULES.rules[0].id, 'r1', 'the first one stays');
  assert.deepEqual(r.RULES.rules[0].log, { '2026-10-01': 1, '2026-10-02': 1 }, 'and keeps what the others kept');
  assert.equal(r.T.items.length, 1, 'the day shows it once');
  assert.equal(r.T.items[0].done, true, 'a tick on any of the copies is a tick');
  assert.equal(r.T.items[0].did, 4);
  assert.deepEqual(r.T.skipped, ['r1'], 'a skip follows the keeper');
  assert.equal(r.cap.fold(), 0, 'nothing left to fold');
});

// "this" and "next" are how people actually say a day, and the box was deaf to both: it found the day name,
// took that out, and left the qualifier behind in the title — "laundry this sunday by 6" became "laundry this".
test('a day can be said with this, next, coming or on, and none of it lands in the title', async () => {
  const r = room();
  await r.cap.capture('laundry this sunday by 6');
  const sun = r.saved['today.2026-10-11'];                    // the coming Sunday; today is Monday 5 Oct
  assert.ok(sun, 'it goes to the coming Sunday');
  assert.equal(sun.items[0].text, 'laundry', 'and the qualifier is not part of what you have to do');
  assert.equal(sun.items[0].at, 18, 'by 6 means six in the evening');

  const r2 = room();
  await r2.cap.capture('laundry next sunday');
  assert.ok(r2.saved['today.2026-10-18'], 'next Sunday is the one after the coming one');
  assert.equal(r2.saved['today.2026-10-18'].items[0].text, 'laundry');

  const r3 = room();
  await r3.cap.capture('call the bank on friday');
  assert.ok(r3.saved['today.2026-10-09'], 'on Friday is simply Friday');
  assert.equal(r3.saved['today.2026-10-09'].items[0].text, 'call the bank', '"on" is not part of the task either');
});

// "by Sunday" is a deadline day, which is not the same as "on Sunday". On Sunday means it is a Sunday job and
// can wait there; by Sunday means do it now, with Sunday the day it stops being optional. Until then it is
// neither kept nor let go, and only the days after count against it.
test('a deadline day puts a to-do on today’s list, not on that day’s', async () => {
  const r = room();
  await r.cap.capture('laundry by sunday');
  assert.equal(r.T.items.length, 1, 'it belongs to today, and every day until the deadline');
  assert.equal(r.T.items[0].text, 'laundry', 'and none of the saying lands in the title');
  assert.equal(r.T.items[0].due, '2026-10-11', 'the coming Sunday is the deadline');
  assert.equal(r.saved['today.2026-10-11'], undefined, 'it does not go and wait in Sunday’s list');

  const r2 = room();
  await r2.cap.capture('laundry sunday');
  assert.equal(r2.T.items.length, 0, 'while "on Sunday" still means exactly that');
  assert.ok(r2.saved['today.2026-10-11'], 'and waits in that day');
});

test('a deadline day and a clock time are different things, and both can be said', async () => {
  const r = room();
  await r.cap.capture('file taxes by friday at 5');
  assert.equal(r.T.items[0].text, 'file taxes');
  assert.equal(r.T.items[0].due, '2026-10-09', 'Friday is the day');
  assert.equal(r.T.items[0].at, 17, 'five is the hour');

  const r2 = room();
  await r2.cap.capture('call the vet by 6');
  assert.equal(r2.T.items[0].due, undefined, '"by 6" is a time, never a day');
  assert.equal(r2.T.items[0].at, 18);

  const r3 = room();
  await r3.cap.capture('renew the passport by december');
  assert.equal(r3.T.items[0].due, '2026-12-31', 'a month named is the end of it');
});

// A calendar date is said half a dozen ways and only one of them worked. "on November 13th" was not read at all,
// because the boundary the regex asked for does not exist between the 3 and the t of "13th" — so the whole
// phrase stayed in the title. Worse, the forms that were read landed on the 30th: a month name was matched on
// its first three letters and taken to mean the end of that month, which is right for "until December" and
// wrong for a month with a day beside it. That one looked like it had worked.
test('a date is a date however it is said, and a month with a day is that day', async () => {
  const forms = ['on November 13th', 'on November 13', 'November 13', 'on Nov 13', 'on 13 November', 'on 13th November'];
  for (const f of forms) {
    const r = room();
    await r.cap.capture('Declare SCM minor ' + f);
    const doc = r.saved['today.2026-11-13'];
    assert.ok(doc, `"${f}" should land on 13 November, not ` + JSON.stringify(Object.keys(r.saved)));
    assert.equal(doc.items[0].text, 'Declare SCM minor', `"${f}" leaves nothing of the date in the title`);
  }
});

test('a bare ordinal means the coming one, not a month away', async () => {
  const r = room();                                    // today is Monday 5 October
  await r.cap.capture('Declare SCM minor on the 13th');
  assert.ok(r.saved['today.2026-10-13'], 'the 13th with no month named is the next 13th there is');
  assert.equal(r.saved['today.2026-10-13'].items[0].text, 'Declare SCM minor');
});

test('a deadline day can be said with a date too', async () => {
  const r = room();
  await r.cap.capture('Declare SCM minor by November 13th');
  assert.equal(r.T.items[0].text, 'Declare SCM minor', 'the ordinal is not left behind');
  assert.equal(r.T.items[0].due, '2026-11-13', 'and it is the thirteenth, not the end of the month');
});

test('a month on its own still means the end of it', async () => {
  const r = room();
  await r.cap.capture('read 20 pages every day until December');
  assert.equal(r.RULES.rules[0].until, '2026-12-31', '"until December" is the end of December');
});
