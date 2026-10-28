// The running grade becomes a daily series: carried forward between readings, absent before the first.
import { test } from 'node:test';
import assert from 'node:assert';
import { buildSeries } from '../api/sync/_patterns.js';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; the logic under test never queries

test('grade series', async () => {
  const today = '2026-10-01';
  const school = { courses: [
    { id: 'a', marks: [{ d: '2026-09-20', pct: 90 }, { d: '2026-09-25', pct: 80 }] },
    { id: 'b', marks: [{ d: '2026-09-20', pct: 70 }] },
  ], sessions: [] };
  const { S } = await buildSeries(async k => (k === 'school' ? school : null), today, async () => ({}));
  const g = S.grade;
  assert.equal(g['2026-09-19'], undefined, 'nothing before the first reading');
  assert.equal(g['2026-09-20'], 80, 'two courses on the first day average to 80');
  assert.equal(g['2026-09-22'], 80, 'a day with no new reading keeps the standing mark');
  assert.equal(g['2026-09-25'], 75, 'one course moves; the other still counts');
  assert.equal(g[today], 75, 'and it carries to today');
  console.log('grade: days =', Object.keys(g).length, '· first =', Object.keys(g).sort()[0], '· today =', g[today]);
});
