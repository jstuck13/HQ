// A reading you add becomes a series like any other, with its own name, and is tested like the rest.
import { test } from 'node:test';
import assert from 'node:assert';
import { buildSeries } from '../api/sync/_patterns.js';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; the logic under test never queries

test('your own readings', async () => {
  const today = '2026-10-05';
  const days = {};
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.parse(today + 'T12:00:00Z') - i * 864e5).toISOString().slice(0, 10);
    days[d] = { sleep: String(6 + (i % 4) * 0.5), 'r-caffeine': String(80 + (i % 5) * 30), 'r-stretched': i % 2 ? 1 : undefined };
  }
  const health = { readings: [{ id: 'r-caffeine', name: 'Caffeine', kind: 'count' }, { id: 'r-stretched', name: 'Stretched', kind: 'tick' }], days };
  const { S, labels } = await buildSeries(async k => (k === 'health' ? health : null), today, async () => ({}));

  assert.equal(labels['r-caffeine'], 'caffeine', 'its own name, lower-cased for the sentences');
  assert.equal(Object.keys(S['r-caffeine']).length, 40, 'every day it was logged');
  assert.equal(S['r-caffeine'][today], 80);
  assert.ok(Object.keys(S['r-stretched']).length > 0, 'a yes/no reading counts the yes days');
  assert.ok(labels.sleep, 'and the readings HQ ships with are still there');
  console.log('own readings: series =', Object.keys(S['r-caffeine']).length, 'days · label =', labels['r-caffeine']);

  // no readings of your own: nothing extra, nothing broken
  const bare = await buildSeries(async () => ({ days: {} }), today, async () => ({}));
  assert.equal(bare.labels['r-caffeine'], undefined);
  assert.ok(bare.labels.sleep);
});
