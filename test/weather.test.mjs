// The nightly weather fill: settled days are kept, an unsettled one is skipped, and nothing else on the day is lost.
import { test } from 'node:test';
import assert from 'node:assert';
process.env.DATABASE_URL = 'postgresql://u:p@example.neon.tech/db';

const mod = await import('../api/sync/_daily.js');          // weather() is module-private; exercised through a stub fetch
const src = await import('node:fs').then(fs => fs.readFileSync('api/sync/_daily.js', 'utf8'));
const body = src.slice(src.indexOf('async function weather('), src.indexOf('export default syncRoute'));
const weather = new Function('fetch', `${body}; return weather;`)(async () => ({
  ok: true, json: async () => ({ daily: {
    time: ['2026-10-01', '2026-10-02', '2026-10-03'],
    temperature_2m_max: [78, 71, null],                          // the last day has not settled
    temperature_2m_min: [60, 55, null],
    precipitation_sum: [0, 0.42, null],
    sunshine_duration: [36000, 7200, null],
    daylight_duration: [43200, 43100, null],
  } }),
}));

test('weather', async () => {
  let saved = null;
  const health = { geo: { lat: 30.4, lon: -91.1 }, days: { '2026-10-01': { sleep: '7.2', pills: ['m1'] } } };
  const out = await weather(async () => health, async (k, d) => { saved = d; });
  assert.equal(out.days, 2, 'two settled days kept, the unsettled one skipped');
  assert.deepEqual(saved.days['2026-10-01'].wx, { hi: 78, lo: 60, rain: 0, sun: 10, daylight: 12 });
  assert.equal(saved.days['2026-10-01'].sleep, '7.2', 'the rest of the day is untouched');
  assert.deepEqual(saved.days['2026-10-01'].pills, ['m1']);
  assert.equal(saved.days['2026-10-03'], undefined, 'an unsettled day is not written at all');
  assert.equal(saved.days['2026-10-02'].wx.rain, 0.42);

  // run again with nothing changed: no write
  let wrote = false;
  const again = await weather(async () => saved, async () => { wrote = true; });
  assert.equal(again.days, 0); assert.equal(wrote, false, 'an unchanged forecast writes nothing');

  // no location, nothing to do
  assert.equal(await weather(async () => ({ days: {} }), async () => { throw new Error('should not write'); }), null);
  console.log('weather: 2 days kept, unsettled skipped, re-run writes nothing, no geo is a no-op');
});
