// the sieve, checked against series whose answer is known
import { spearman, pValue } from '../api/sync/_patterns.js';
import assert from 'node:assert';

process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; the logic under test never queries

const seed = s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rnd = seed(7);

// perfectly ordered pairs
assert.equal(spearman([1,2,3,4,5],[2,4,6,8,10]).toFixed(3), '1.000');
assert.equal(spearman([1,2,3,4,5],[10,8,6,4,2]).toFixed(3), '-1.000');
// monotone but not linear: rank correlation should still see it whole
assert.equal(spearman([1,2,3,4,5],[1,4,9,16,25]).toFixed(3), '1.000');

// noise must not look like a finding
let n = 200, worst = 0;
for (let t = 0; t < 200; t++) {
  const a = Array.from({length: 40}, rnd), b = Array.from({length: 40}, rnd);
  worst = Math.max(worst, Math.abs(spearman(a, b)));
}
assert.ok(worst < 0.62, 'random pairs reached rho ' + worst.toFixed(2));

// a real relationship buried in noise is found
const x = Array.from({length: 60}, rnd);
const y = x.map(v => v * 0.8 + rnd() * 0.5);
const r = spearman(x, y);
assert.ok(r > 0.6, 'planted relationship only reached ' + r.toFixed(2));
assert.ok(pValue(r, 60) < 0.001, 'planted relationship p ' + pValue(r, 60));

// p-values behave: no correlation is not significant, and more days make the same rho stronger evidence
assert.ok(pValue(0.05, 40) > 0.5);
assert.ok(pValue(0.45, 30) < 0.05);
assert.ok(pValue(0.45, 100) < pValue(0.45, 30));

// ties do not break the ranking
assert.ok(Math.abs(spearman([1,1,1,2,2,3],[1,1,2,2,3,3]) - 0.83915) < 1e-4);   // mid-ranks, checked by hand

console.log('patterns: the arithmetic holds — worst noise rho over 200 tries was', worst.toFixed(2));

// ---- the sieve as a whole: noise must not get through, a planted pair must ----
const { patterns } = await import('../api/sync/_patterns.js');
const iso = d => new Date(d).toISOString().slice(0, 10);
const day = n => iso(Date.UTC(2026, 5, 1) + n * 86400000);

// a fake store: ninety days of health, with sleep and HRV planted together and everything else random
function store(planted) {
  const rn = seed(11), days = {};
  for (let i = 0; i < 90; i++) {
    const s = 6 + rn() * 3;
    days[day(i)] = { pills: ['m1'], sleep: s.toFixed(1), hr: String(Math.round(50 + rn() * 8)),
      weight: (170 + rn() * 4).toFixed(1), steps: String(Math.round(4000 + rn() * 8000)),
      garmin: { hrv: Math.round(planted ? 40 + (s - 6) * 14 + rn() * 6 : 40 + rn() * 40), bb: Math.round(60 + rn() * 35), resp: +(14 + rn() * 3).toFixed(1), score: Math.round(70 + rn() * 25) } };
  }
  const docs = { health: { meds: [{ id: 'm1' }], days }, patterns: null };
  return {
    get: async k => docs[k] ?? null,
    put: async (k, v) => { docs[k] = v; },
    docs,
  };
}

for (const planted of [false, true]) {
  const st = store(planted);
  await patterns(st.get, st.put, day(89));          // first night
  const first = st.docs.patterns;
  await patterns(st.get, st.put, day(89));          // second night, same data
  const doc = st.docs.patterns;
  const pair = doc.all.find(x => (x.a === 'sleep' && x.b === 'hrv') || (x.a === 'hrv' && x.b === 'sleep'));
  if (planted) {
    assert.ok(pair, 'the planted pair was not found');
    assert.ok(Math.abs(pair.rho) > 0.6, 'planted rho only ' + pair.rho);
    assert.equal(first.shown.length, 0, 'something was shown on the very first night');
    assert.ok(doc.shown.some(x => x.key === pair.key), 'the planted pair was not shown on the second night');
    console.log(`patterns: planted pair found — rho ${pair.rho}, n ${pair.n}, halves ${pair.r1}/${pair.r2}; ${doc.tested} pairs tested, ${doc.shown.length} shown`);
  } else {
    assert.equal(doc.shown.length, 0, 'noise produced ' + doc.shown.length + ' findings: ' + JSON.stringify(doc.shown));
    console.log(`patterns: pure noise — ${doc.tested} pairs tested, ${doc.all.length} kept, ${doc.shown.length} shown`);
  }
}

// too little data says so rather than guessing
{
  const st = store(true);
  for (const k of Object.keys(st.docs.health.days).slice(20)) delete st.docs.health.days[k];
  const r = await patterns(st.get, st.put, day(89));
  assert.equal(r.shown, 0);
  console.log('patterns: twenty days of data →', r.series, 'series long enough to test,', r.tested, 'pairs tested');
}
