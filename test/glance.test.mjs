// The widget reads /api/glance and draws whatever comes back, with no chance to ask a follow-up question and no
// way to tell a wrong answer from a right one. So the reading has to be right the first time, and these are the
// questions the widget cannot ask for itself: does a weekly calendar entry fall today, is a thing late or merely
// timed, and does the tick handle it hands back still name something that can be ticked.
import { test } from 'node:test';
import assert from 'node:assert';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; never used here
const { glanceFrom } = await import('../api/glance.js');

// 2026-10-28 is a Wednesday; getUTCDay() === 3
const WED = '2026-10-28';
const THU = '2026-10-29';

test('an untimed to-do is open but never late', () => {
  const g = glanceFrom({ todo: { items: [{ text: 'Laundry', done: false }] } }, WED, 14);
  assert.equal(g.open, 1);
  assert.equal(g.todos[0].at, null);
  assert.equal(g.todos[0].late, false);
});

test('late is the hour passing, not the day', () => {
  const items = [{ text: 'Call', at: 9, done: false }, { text: 'Gym', at: 18, done: false }];
  const noon = glanceFrom({ todo: { items } }, WED, 12);
  assert.deepEqual(noon.todos.map(i => i.late), [true, false]);
  const dawn = glanceFrom({ todo: { items } }, WED, 7);
  assert.deepEqual(dawn.todos.map(i => i.late), [false, false]);
});

test('a ticked thing is never late and never counted open', () => {
  const g = glanceFrom({ todo: { items: [{ text: 'Call', at: 9, done: true }] } }, WED, 20);
  assert.equal(g.open, 0);
  assert.equal(g.done, 1);
  assert.equal(g.todos[0].late, false);
});

test('the tick handle is the text the widget drew', () => {
  // the widget builds today.html?tick=<text>; if this stopped being the item's own text the tap would miss
  const g = glanceFrom({ todo: { items: [{ text: 'Load of laundry', done: false }] } }, WED, 10);
  assert.equal(g.todos[0].text, 'Load of laundry');
});

test('a one-off calendar entry falls only on its own date', () => {
  const cal = { series: [{ title: 'Dentist', date: WED, start: 9, end: 10 }] };
  assert.equal(glanceFrom({ cal }, WED, 8).events.length, 1);
  assert.equal(glanceFrom({ cal }, THU, 8).events.length, 0);
});

test('a weekly entry repeats on its named days, and not before it began', () => {
  // begins on the Wednesday, repeats Wednesdays (3); the Tuesday before must stay empty
  const cal = { series: [{ title: 'Lecture', date: WED, start: 11, end: 12, rep: [3] }] };
  assert.equal(glanceFrom({ cal }, WED, 8).events.length, 1);
  assert.equal(glanceFrom({ cal }, '2026-11-04', 8).events.length, 1);   // the next Wednesday
  assert.equal(glanceFrom({ cal }, '2026-10-27', 8).events.length, 0);   // the Tuesday before it began
});

test('a hidden category is not drawn', () => {
  const cal = { series: [{ title: 'Dentist', date: WED, start: 9, end: 10, cat: 'med' }], hidden: ['med'] };
  assert.equal(glanceFrom({ cal }, WED, 8).events.length, 0);
});

test('now is the entry the hour is inside; next is the one after it', () => {
  const cal = { series: [
    { title: 'Standup', date: WED, start: 9, end: 9.5 },
    { title: 'Lecture', date: WED, start: 11, end: 12 },
    { title: 'Gym', date: WED, start: 17, end: 18 },
  ] };
  const g = glanceFrom({ cal }, WED, 11.5);
  assert.equal(g.now.title, 'Lecture');
  assert.equal(g.next.title, 'Gym');
  const before = glanceFrom({ cal }, WED, 8);
  assert.equal(before.now, null);
  assert.equal(before.next.title, 'Standup');
});

test('events come back in order however they were stored', () => {
  const cal = { series: [
    { title: 'Gym', date: WED, start: 17, end: 18 },
    { title: 'Standup', date: WED, start: 9, end: 9.5 },
  ] };
  assert.deepEqual(glanceFrom({ cal }, WED, 8).events.map(e => e.title), ['Standup', 'Gym']);
});

test('a day with nothing in it answers, rather than failing', () => {
  const g = glanceFrom({}, WED, 10);
  assert.equal(g.open, 0);
  assert.deepEqual(g.todos, []);
  assert.deepEqual(g.events, []);
  assert.equal(g.now, null);
  assert.equal(g.next, null);
  assert.equal(g.word, null);
});

test('the word comes through only when it has one', () => {
  assert.equal(glanceFrom({ daily: { word: {} } }, WED, 10).word, null);
  const g = glanceFrom({ daily: { word: { w: 'obdurate', pos: 'adj.', def: 'Stubbornly refusing.' } } }, WED, 10);
  assert.deepEqual(g.word, { w: 'obdurate', pos: 'adj.', def: 'Stubbornly refusing.' });
});

// ---- the reading face ----
// A widget redraws on the system's schedule with no chance to ask anything, so the pace, the percentage and the
// jacket have to be right the first time. These are the cases the tile cannot work out for itself.
const { faceReading } = await import('../api/glance.js');

const shelf = (o = {}) => ({ books: [Object.assign({
  shelf: 'reading', title: 'Project Hail Mary', author: 'Andy Weir', pages: 476, page: 180,
  log: { '2026-10-22': 90, '2026-10-25': 140, '2026-10-28': 180 },
}, o)] });
const TODAY = '2026-10-28';

test('nothing on the reading shelf says so, and draws nothing', () => {
  const g = faceReading({ books: [{ shelf: 'read', title: 'Done' }] }, TODAY);
  assert.equal(g.big, null);
  assert.deepEqual(g.lines, []);
  assert.equal(g.foot, 'Nothing on the go.');
});

test('the book is the name and the author the second line, never a caption for the figure', () => {
  const g = faceReading(shelf(), TODAY);
  assert.equal(g.title, 'Project Hail Mary');
  assert.equal(g.sub, 'Andy Weir');
  assert.equal(g.big.k, 'through');
});

test('the figure and the bar agree', () => {
  const g = faceReading(shelf(), TODAY);
  assert.equal(g.big.v, '38%');
  assert.ok(Math.abs(g.bar - 180 / 476) < 1e-9);
});

test('the week counts only the last seven days of the log', () => {
  // 90 is older than a week from the 28th; the gains inside it are 90->140 and 140->180
  const g = faceReading(shelf(), TODAY);
  assert.deepEqual(g.lines.find(l => l.t === 'This week'), { t: 'This week', v: '90 pages' });
});

test('a week with no reading offers no pace, because there is none', () => {
  const g = faceReading(shelf({ log: { '2026-09-01': 40, '2026-09-04': 180 } }), TODAY);
  assert.equal(g.lines.find(l => l.t === 'This week').v, '0 pages');
  assert.equal(g.lines.find(l => l.t === 'At this pace'), undefined, 'no reading cannot predict a finish');
});

test('a finished book says so rather than counting down', () => {
  const g = faceReading(shelf({ page: 476 }), TODAY);
  assert.equal(g.big.v, '100%');
  assert.equal(g.lines.find(l => l.t === 'At this pace'), undefined);
  assert.deepEqual(g.lines.find(l => l.t === 'Finished'), { t: 'Finished', v: 'the last page', tone: 'good' });
});

test('a book with no page count still draws, without a figure or a bar', () => {
  const g = faceReading(shelf({ pages: 0, page: 0, log: {} }), TODAY);
  assert.equal(g.big, null);
  assert.equal(g.bar, null);
  assert.equal(g.lines.find(l => l.t === 'Page'), undefined);
});

test('the nudge appears only on a day with nothing logged', () => {
  assert.equal(faceReading(shelf(), TODAY).foot, null, 'logged today: nothing to say');
  assert.equal(faceReading(shelf({ log: { '2026-10-25': 140 }, page: 140 }), TODAY).foot, 'Nothing logged today.');
});

test('the jacket comes from the cover id first, the ISBN second, and is null without either', () => {
  assert.match(faceReading(shelf({ coverId: 1234 }), TODAY).cover, /\/b\/id\/1234-L\.jpg\?default=false$/);
  assert.match(faceReading(shelf({ isbn: '9780593135204' }), TODAY).cover, /\/b\/isbn\/9780593135204-L\.jpg/);
  assert.equal(faceReading(shelf(), TODAY).cover, null);
  // default=false matters: without it Open Library answers a grey placeholder and the tile cannot tell
  assert.match(faceReading(shelf({ coverId: 7 }), TODAY).cover, /default=false/);
});

test('a page count that ran past the end does not report more than all of it', () => {
  const g = faceReading(shelf({ page: 500 }), TODAY);
  assert.equal(g.bar, 1, 'the bar cannot overrun its track');
});
