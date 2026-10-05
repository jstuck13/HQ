// Things that moved together. Once a night, every daily series HQ keeps is ranked against every other one,
// same day and next day, and the few pairs that survive a deliberately strict sieve are written to `patterns`.
//
// Nothing here claims a cause, and the sieve is the honesty: with eighteen series there are hundreds of pairs,
// and at the usual thresholds roughly one in twenty would clear by chance alone. So a pair is only kept when it
//   · has at least MIN_DAYS days of both series,
//   · is strong (Spearman |rho| >= MIN_RHO) rather than merely significant,
//   · holds in BOTH halves of the window, in the same direction,
//   · survives a Benjamini-Hochberg correction across every pair tested that night,
//   · and has done all of that on two separate nights.
// Pairs that are the same fact twice (sleep against its own stages) are never tested at all.

const WINDOW = 120;          // days looked back over
const MIN_DAYS = 30;         // paired days a claim needs
const MIN_RHO = 0.45;        // and how strong it has to be
const HALF_RHO = 0.25;       // each half of the window must agree this much
const FDR_Q = 0.05;          // false-discovery rate across the night's tests
const NEEDED_NIGHTS = 2;     // and it must survive that many nights running

const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => iso(new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000));
const num = v => { const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v; return typeof n === 'number' && isFinite(n) ? n : null; };
// a clock reading as hours since midnight; a bedtime after 8pm counts as negative so "late" is always larger
const clockHours = (t, night = false) => { const m = /(\d{1,2})[.:](\d{2})\s*(am|pm)/i.exec(t || ''); if (!m) return null;
  let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; const v = h + +m[2] / 60; return night && v > 16 ? v - 24 : v; };

// ---- the series HQ can build for a day, and which of them are the same fact twice ----
const FAMILY = { sleep: 'sleep', score: 'sleep', deep: 'sleep', light: 'sleep', rem: 'sleep', awake: 'sleep', bed: 'sleep', woke: 'sleep', battery: 'sleep',
  opens: 'phone', screen: 'phone',   // reaching for it and time spent on it are the same habit twice
  energy: 'feel', mood: 'feel' };    // and both are the same question answered twice: how the day went
const LABEL = {
  sleep: 'hours asleep', score: 'sleep score', deep: 'deep sleep', light: 'light sleep', rem: 'REM sleep', awake: 'time awake in bed',
  bed: 'bedtime', woke: 'waking time', battery: 'body battery', hrv: 'HRV', hr: 'resting heart rate', resp: 'breaths a minute',
  steps: 'steps', weight: 'weight', supplements: 'supplements taken', spend: 'money spent', study: 'minutes studied',
  pages: 'pages read', cards: 'cards read', booked: 'hours on the calendar', todos: 'to-dos ticked',
  grade: 'the running grade', opens: 'times you reached for the phone', screen: 'minutes of screen time',
  energy: 'how much energy you had', mood: 'how the day felt',
};
const HIGHER = { bed: 'later', woke: 'later' };   // for wording: a bigger number is not always "more"

export async function buildSeries(getDoc, today, getMany) {
  const from = addDays(today, -(WINDOW - 1));
  const days = []; for (let d = from; d <= today; d = addDays(d, 1)) days.push(d);
  const S = {}; for (const k of Object.keys(LABEL)) S[k] = {};

  const health = (await getDoc('health')) || {};
  const meds = (health.meds || []).length;
  for (const [d, r] of Object.entries(health.days || {})) {
    if (d < from || d > today) continue;
    const g = r.garmin || {};
    const put = (k, v) => { if (v != null && isFinite(v)) S[k][d] = v; };
    put('sleep', num(r.sleep)); put('hr', num(r.hr)); put('weight', num(r.weight)); put('steps', num(r.steps));
    put('opens', num(r.opens)); put('screen', num(r.screen));
    put('energy', num(r.energy)); put('mood', num(r.mood));
    put('score', num(g.score)); put('hrv', num(g.hrv)); put('battery', num(g.bb)); put('resp', num(g.resp));
    put('deep', g.deep != null ? g.deep / 60 : null); put('light', g.light != null ? g.light / 60 : null);
    put('rem', g.rem != null ? g.rem / 60 : null); put('awake', g.awake != null ? g.awake / 60 : null);
    put('bed', clockHours(r.bed, true)); put('woke', clockHours(r.woke));
    if (meds) put('supplements', (r.pills || []).length);
  }

  // money out, month by month
  const months = [...new Set(days.map(d => d.slice(0, 7)))], kept = new Set();
  for (const ym of months) { const fin = await getDoc('finances.' + ym); if (!fin) continue; kept.add(ym);
    for (const t of fin.tx || []) if (t.date >= from && t.date <= today) S.spend[t.date] = (S.spend[t.date] || 0) + (+t.amt || 0); }
  for (const d of days) if (S.spend[d] == null && kept.has(d.slice(0, 7))) S.spend[d] = 0;   // a day inside a month you kept and bought nothing is a zero; a month with no document at all is a gap

  const school = (await getDoc('school')) || {};
  for (const s of school.sessions || []) if (s.date >= from && s.date <= today) S.study[s.date] = (S.study[s.date] || 0) + (+s.min || 0);
  // the running grade across courses, carried forward: Canvas reports it when it changes, but it is a standing
  // figure on every day in between, so a day with no new reading still has the mark it stood at.
  { const all = {};
    for (const c of school.courses || []) for (const m of c.marks || []) {
      if (m.pct == null) continue;
      (all[m.d] ??= {})[c.id] = +m.pct;
    }
    const dates = Object.keys(all).sort(); let standing = null;
    for (const d of days) {
      for (const k of dates) { if (k <= d) standing = { ...standing, ...all[k] }; }
      if (!standing || d < dates[0]) continue;
      const vals = Object.values(standing);
      if (vals.length) S.grade[d] = vals.reduce((n, v) => n + v, 0) / vals.length;
    }
  }

  const lib = (await getDoc('library')) || {};
  for (const b of lib.books || []) { const log = Object.entries(b.log || {}).sort(); let prev = null;
    for (const [d, p] of log) { if (prev != null && d >= from && d <= today) { const read = +p - prev; if (read > 0) S.pages[d] = (S.pages[d] || 0) + read; } prev = +p; } }

  const study = (await getDoc('study')) || {};
  for (const [d, r] of Object.entries(study.days || {})) if (d >= from && d <= today && r.cards) S.cards[d] = r.done ? r.cards.length : 0;

  // hours the calendar says were spoken for
  const cal = (await getDoc('calendar')) || {};
  const wd = d => (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const calFrom = (cal.series || []).reduce((m, s) => (s.date && s.date < m ? s.date : m), today);
  for (const d of days) { if (d < calFrom) continue; let hours = 0;
    for (const s of cal.series || []) { const rep = s.rep || [];
      const on = rep.length ? (d >= s.date && [...new Set([wd(s.date), ...rep])].includes(wd(d))) : s.date === d;
      if (on) hours += Math.max(0, (+s.end || 0) - (+s.start || 0)); }
    if ((cal.series || []).length) S.booked[d] = hours; }

  // to-dos are a document a day; the whole window comes back in one query
  const todoDocs = getMany ? await getMany(days.map(d => 'today.' + d)) : {};
  for (const d of days) { const items = (todoDocs['today.' + d] || {}).items || [];
    if (items.length) S.todos[d] = items.filter(i => i.done).length / items.length; }

  return { S, days, from };
}

// ---- the arithmetic ----
const rank = xs => { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; } return r; };

export const spearman = (a, b) => {
  const n = a.length; if (n < 4) return null;
  const ra = rank(a), rb = rank(b);
  const mean = v => v.reduce((x, y) => x + y, 0) / v.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = ra[i] - ma, y = rb[i] - mb; num += x * y; da += x * x; db += y * y; }
  if (!da || !db) return null;
  return num / Math.sqrt(da * db);
};
// Fisher's transform, then the normal tail: the usual two-sided p for a correlation
const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y; };
export const pValue = (rho, n) => { if (n < 5 || Math.abs(rho) >= 1) return 0;
  const z = Math.atanh(rho) * Math.sqrt(n - 3);
  return Math.max(0, Math.min(1, 2 * (1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2))))); };

const pairUp = (S, ka, kb, days, lag) => {
  const a = [], b = [];
  for (const d of days) { const x = S[ka][d]; const y = S[kb][lag ? addDays(d, 1) : d];
    if (x != null && y != null) { a.push(x); b.push(y); } }
  return [a, b];
};

export async function patterns(getDoc, putDoc, today, getMany) {
  const { S, days } = await buildSeries(getDoc, today, getMany);
  const keys = Object.keys(LABEL).filter(k => Object.keys(S[k]).length >= MIN_DAYS);
  const tests = [];
  for (let i = 0; i < keys.length; i++) for (let j = 0; j < keys.length; j++) {
    const ka = keys[i], kb = keys[j];
    if (i === j) continue;
    if (FAMILY[ka] && FAMILY[ka] === FAMILY[kb]) continue;          // the same fact twice
    for (const lag of [0, 1]) {
      if (!lag && j < i) continue;                                   // same-day pairs only need testing once
      const [a, b] = pairUp(S, ka, kb, days, lag);
      const n = a.length; if (n < MIN_DAYS) continue;
      const rho = spearman(a, b); if (rho == null) continue;
      const half = Math.floor(n / 2);
      const r1 = spearman(a.slice(0, half), b.slice(0, half)), r2 = spearman(a.slice(half), b.slice(half));
      tests.push({ a: ka, b: kb, lag, n, rho, r1, r2, p: pValue(rho, n), pts: a.map((v, k) => [+v.toFixed(2), +b[k].toFixed(2)]) });
    }
  }
  // Benjamini-Hochberg across everything tested tonight
  const sorted = [...tests].sort((x, y) => x.p - y.p);
  let cut = -1; for (let i = 0; i < sorted.length; i++) if (sorted[i].p <= FDR_Q * (i + 1) / sorted.length) cut = i;
  const passedFDR = new Set(sorted.slice(0, cut + 1));

  const strong = tests.filter(t =>
    Math.abs(t.rho) >= MIN_RHO &&
    t.r1 != null && t.r2 != null &&
    Math.sign(t.r1) === Math.sign(t.rho) && Math.sign(t.r2) === Math.sign(t.rho) &&
    Math.abs(t.r1) >= HALF_RHO && Math.abs(t.r2) >= HALF_RHO &&
    passedFDR.has(t));

  // a pair has to do it on two nights before anyone is told
  const prev = (await getDoc('patterns')) || {};
  const before = Object.fromEntries((prev.all || []).map(x => [x.key, x]));
  const all = strong.map(t => { const key = `${t.a}|${t.b}|${t.lag}`, was = before[key];
    const nights = was && Math.sign(was.rho) === Math.sign(t.rho) ? (was.nights || 1) + 1 : 1;
    return { key, a: t.a, b: t.b, lag: t.lag, n: t.n, rho: +t.rho.toFixed(3), r1: +t.r1.toFixed(2), r2: +t.r2.toFixed(2), p: t.p, nights,
             since: (was && was.since) || today, points: t.pts.slice(-90) };   // the cloud, so the reader can judge it themselves
  }).sort((x, y) => Math.abs(y.rho) - Math.abs(x.rho));

  const doc = {
    date: today, window: WINDOW, tested: tests.length,
    series: Object.fromEntries(Object.keys(LABEL).map(k => [k, Object.keys(S[k]).length])),
    testable: keys,
    all, shown: all.filter(x => x.nights >= NEEDED_NIGHTS),
    thresholds: { MIN_DAYS, MIN_RHO, HALF_RHO, FDR_Q, NEEDED_NIGHTS },
    labels: LABEL, higher: HIGHER,
  };
  await putDoc('patterns', doc);
  return { tested: tests.length, kept: all.length, shown: doc.shown.length, series: keys.length };
}
