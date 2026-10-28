// The Sunday digest's lines: real figures, the week before for comparison, and nothing said that is not there.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const src = readFileSync('api/sync/_notify.js', 'utf8');
const head = src.slice(src.indexOf('const days = (a, b)'), src.indexOf('const slotOf'));
const body = src.slice(src.indexOf('const weekLines ='), src.indexOf('export default syncRoute'));
const weekLines = new Function(`${head}\n${body}\nreturn weekLines;`)();

const day = (n) => new Date(Date.parse('2026-09-20T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

test('the week in a push', async () => {
  const health = { days: {} };
  for (let i = 0; i < 7; i++) health.days[day(-i)] = { sleep: '7.5', energy: 4, opens: 30 };
  for (let i = 7; i < 14; i++) health.days[day(-i)] = { sleep: '6.6', opens: 41 };
  const school = { courses: [{ name: 'PHYS', mark: { pct: 88.2 }, marks: [{ d: day(-20), pct: 92.5 }, { d: day(-1), pct: 88.2 }] }],
                   sessions: [{ date: day(-2), min: 90 }, { date: day(-30), min: 60 }] };
  const lib = { books: [{ title: 'PHM', log: { [day(-6)]: 100, [day(-1)]: 240 } }] };
  const fin = { tx: [{ date: day(-1), amt: 20.5 }, { date: day(-3), amt: 12 }, { date: day(-40), amt: 999 }] };

  const out = await weekLines(async k => (k.startsWith('finances') ? fin : null), '2026-09-20', health, school, lib);
  const all = out.join(' | ');
  assert.match(all, /7\.5 h of sleep a night, up 0\.9/, 'sleep, and the rise on last week');
  assert.match(all, /rated the days 4\.0 of 5/);
  assert.match(all, /2 purchases, \$33 out/, 'only the week; the old purchase is out');
  assert.match(all, /1\.5 h studied · PHYS down 4\.3/);
  assert.match(all, /140 pages read/);
  assert.match(all, /30 reaches for the phone a day/);
  console.log('week push:', out.length, 'lines →', all);

  // a week with nothing in it says nothing at all
  const quiet = await weekLines(async () => null, '2026-09-20', { days: {} }, null, null);
  assert.deepEqual(quiet, [], 'an empty week produces no push');
});
