// How many times a to-do was actually asked of you. Rollover copies an unticked to-do into the next day while
// it stays unticked, so six mornings of "load of laundry" is not six loads: it is one done the day it was
// written and one put off for four days. Counting the mornings made The List, the week and the digest all say
// six — and made Today's carry-forward lose work. One reading, in recur.js, now answers for all of them.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const iso = d => d.toISOString().slice(0, 10);
const clock = { today: '2026-10-06', daysBetween: (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) };
const win = { clock };
new Function('window', 'clock', readFileSync('recur.js', 'utf8'))(win, clock);
const { askings, tally } = win.hqRecur;

const d = (day, extra = {}) => ({ day, text: 'load of laundry', done: false, ...extra });

test('a to-do put off for four days is one load of laundry, not five', () => {
  const out = askings([
    d('2026-10-01', { done: true }),                            // washed the day it was written
    d('2026-10-02'),                                            // written again, and then put off
    d('2026-10-03', { from: '2026-10-02' }),
    d('2026-10-04', { from: '2026-10-02' }),
    d('2026-10-05', { from: '2026-10-02' }),
    d('2026-10-06', { from: '2026-10-02', done: true }),
  ], false);
  assert.equal(out.length, 2, 'two loads, not six');
  assert.deepEqual(out.map(o => o.made), ['2026-10-01', '2026-10-02']);
  assert.equal(out[0].waited, 0, 'the first was done the day it was asked');
  assert.equal(out[1].done, true);
  assert.equal(out[1].settled, '2026-10-06');
  assert.equal(out[1].waited, 4, 'and the second sat for four days');
});

test('one still sitting there counts once, and is not done', () => {
  const out = askings([d('2026-10-04'), d('2026-10-05', { from: '2026-10-04' }), d('2026-10-06', { from: '2026-10-04' })], false);
  assert.equal(out.length, 1);
  assert.equal(out[0].done, false);
  assert.equal(out[0].last, '2026-10-06', 'still on the list this morning');
  assert.equal(out[0].waited, 2);
});

test('a standing to-do is asked afresh every day its rule falls on', () => {
  const out = askings([d('2026-10-04', { done: true }), d('2026-10-05'), d('2026-10-06', { done: true, did: 3 })], true);
  assert.equal(out.length, 3, 'three days of a daily practice are three askings');
  assert.deepEqual(out.map(o => o.done), [true, false, true]);
  assert.equal(out[2].did, 3);
  assert.deepEqual(out.map(o => o.waited), [0, 0, 0], 'a standing item never carries, so it never waits');
});

test('the same words written fresh on two separate days are two askings', () => {
  const out = askings([d('2026-09-01', { done: true }), d('2026-10-06', { done: true })], false);
  assert.equal(out.length, 2, 'no `from` chain between them, so they are not the same one carried');
});

// ---- a whole span of day-documents, which is what the week, the month and Today's carry all read ----
test('a span of days reads as things, and the times each was asked', () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
  const docs = [
    { items: [{ text: 'load of laundry', done: true }, { text: 'cadence practice', done: true, rule: 'r1' }] },
    { items: [{ text: 'load of laundry' }, { text: 'cadence practice', rule: 'r1' }] },
    null,                                                       // a day never opened
    { items: [{ text: 'load of laundry', from: '2026-10-02', done: true },
              { text: 'cadence practice', done: true, rule: 'r1', did: 2, target: { n: 2, unit: 'sets' } }] },
  ];
  const out = tally(docs, days);
  const wash = out.find(g => g.text === 'load of laundry'), cad = out.find(g => g.text === 'cadence practice');
  assert.equal(wash.standing, false);
  assert.equal(wash.asks.length, 2, 'one washed, one put off across a day the page never opened');
  assert.equal(wash.asks[1].waited, 2);
  assert.equal(cad.standing, true);
  assert.equal(cad.asks.length, 3, 'a rule asks on every day it falls on');
  assert.deepEqual(cad.target, { n: 2, unit: 'sets' }, 'the target is remembered wherever it appeared');

  const asks = out.flatMap(g => g.asks);
  assert.equal(asks.length, 5, 'five askings in all');
  assert.equal(asks.filter(a => a.done).length, 4, 'four of them done');
  // the old reading counted mornings: six items across the documents, which is the number that was wrong
  assert.equal(docs.flatMap(x => (x && x.items) || []).length, 6, 'the morning count it replaces');
});

test('an empty span says nothing rather than dividing by nothing', () => {
  assert.deepEqual(tally([], []), []);
  assert.deepEqual(tally([null, { items: [] }], ['2026-10-01', '2026-10-02']), []);
  assert.deepEqual(askings([], false), []);
});

// ---- a rule's own record, which Today and The List both write now ----
test('a rule keeps one mark per day answered, and only the last hundred and twenty', () => {
  const r = { id: 'r1', text: 'cadence practice' };
  assert.equal(win.hqRecur.mark(r, '2026-10-05', true), true);
  win.hqRecur.mark(r, '2026-10-06', false);
  assert.deepEqual(r.log, { '2026-10-05': 1, '2026-10-06': 0 });
  win.hqRecur.mark(r, '2026-10-06', true);
  assert.equal(r.log['2026-10-06'], 1, 'answering again that day replaces the day, it does not add one');

  for (let i = 0; i < 200; i++) win.hqRecur.mark(r, iso(new Date(Date.UTC(2026, 0, 1) + i * 864e5)), true);
  assert.equal(Object.keys(r.log).length, 120, 'the record is kept to a hundred and twenty days');
  assert.equal(win.hqRecur.mark(null, '2026-10-06', true), false, 'a rule that is not there is not an error');
});

// ---- a deadline day: the days before it are days you still had ----
test('a to-do with a deadline is pending until the day passes, then overdue', () => {
  // asked last Friday, due this coming Friday, still not done — today is 6 Oct
  const open = askings([
    { day: '2026-10-02', text: 'laundry', done: false, due: '2026-10-09' },
    { day: '2026-10-05', text: 'laundry', from: '2026-10-02', done: false, due: '2026-10-09' },
    { day: '2026-10-06', text: 'laundry', from: '2026-10-02', done: false, due: '2026-10-09' },
  ], false)[0];
  assert.equal(open.due, '2026-10-09');
  assert.equal(open.pending, true, 'four days still to go is not a day missed');
  assert.equal(open.over, 0, 'and nothing is overdue yet');
  assert.equal(open.waited, 4, 'it has sat four days, which is a different fact');

  // the same thing, a week later and still undone
  const late = askings([
    { day: '2026-10-02', text: 'laundry', done: false, due: '2026-10-04' },
    { day: '2026-10-06', text: 'laundry', from: '2026-10-02', done: false, due: '2026-10-04' },
  ], false)[0];
  assert.equal(late.pending, false, 'the day has passed, so it is being counted now');
  assert.equal(late.over, 2, 'two days past the deadline');

  // done before the deadline: never late, never pending
  const kept = askings([
    { day: '2026-10-02', text: 'laundry', done: false, due: '2026-10-09' },
    { day: '2026-10-03', text: 'laundry', from: '2026-10-02', done: true, due: '2026-10-09' },
  ], false)[0];
  assert.equal(kept.done, true);
  assert.equal(kept.pending, false);
  assert.equal(kept.over, 0, 'done with six days to spare');

  // done after it: late by exactly the days past
  const slipped = askings([
    { day: '2026-10-01', text: 'laundry', done: false, due: '2026-10-02' },
    { day: '2026-10-05', text: 'laundry', from: '2026-10-01', done: true, due: '2026-10-02' },
  ], false)[0];
  assert.equal(slipped.over, 3, 'finished three days after it was due');
});

test('a to-do with no deadline is never pending', () => {
  const o = askings([{ day: '2026-10-02', text: 'bins', done: false }], false)[0];
  assert.equal(o.pending, false, 'nothing to wait for means nothing to excuse');
  assert.equal(o.over, 0);
  assert.equal(o.due, null);
});
