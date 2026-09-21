// Scheduled expenses → this month's Finances. The rules live in `finances.rules`; each morning any occurrence up to
// today that is not yet in the month's log is posted (once, keyed by rule and date). The page does the same when opened.
import { syncRoute } from './_run.js';

const TZ = process.env.HQ_TZ || 'America/Chicago';
const today = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const iso = d => d.toISOString().slice(0, 10);
const at = s => new Date(s + 'T12:00:00Z');
const monday = d => { const x = new Date(d); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };

function occurrences(r, from, to) {
  const out = [], start = r.start || from, n = r.n || 1;
  if (r.every === 'month') { const s = at(start);
    for (let d = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1, 12)); iso(d) <= to; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 12))) {
      const months = (d.getUTCFullYear() - s.getUTCFullYear()) * 12 + (d.getUTCMonth() - s.getUTCMonth()); if (months < 0 || months % n) continue;
      const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(), on = iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), Math.min(+r.day, dim), 12)));
      if (on >= start && on >= from && on <= to) out.push(on); } }
  if (r.every === 'week') { const s = monday(at(start));
    for (let d = at(from); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) { if ((d.getUTCDay() + 6) % 7 !== +r.day) continue; const weeks = Math.round((monday(d) - s) / 6048e5); if (weeks < 0 || weeks % n) continue; const on = iso(d); if (on >= start) out.push(on); } }
  if (r.every === 'year') { for (let y = +from.slice(0, 4); y <= +to.slice(0, 4); y++) { const years = y - +start.slice(0, 4); if (years < 0 || years % n) continue; const on = `${y}-${r.day}`; if (on >= start && on >= from && on <= to) out.push(on); } }
  return out;
}

export default syncRoute('bills', async ({ getDoc, putDoc }) => {
  const rules = (await getDoc('finances.rules')) || { rules: [] };
  if (!rules.rules.length) return { posted: 0, rules: 0 };
  const t = today(), ym = t.slice(0, 7), key = 'finances.' + ym;
  let month = await getDoc(key);
  if (!month) {   // the page has not opened this month yet: start it from last month's categories, as the page would
    const p = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1, 12)), prev = await getDoc('finances.' + iso(p).slice(0, 7));
    month = { expected: prev ? prev.expected || 0 : 0, income: [], plan: [], cats: prev ? (prev.cats || []).map(c => ({ ...c })) : [], tx: [], history: prev ? [...(prev.history || []).slice(-5), [p.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), (prev.income || []).reduce((n, i) => n + i.amt, 0), (prev.tx || []).reduce((n, x) => n + x.amt, 0)]] : [] };
  }
  month.tx ??= []; let posted = 0;
  for (const r of rules.rules) {
    if (!(month.cats || []).some(c => c.id === r.cat)) continue;
    for (const on of occurrences(r, ym + '-01', t)) {
      if (month.tx.some(x => x.rule === r.id && x.on === on)) continue;
      month.tx.push({ id: Date.now() + posted, date: on, what: r.what, cat: r.cat, amt: r.amt, rule: r.id, on }); posted++;
    }
  }
  if (posted) await putDoc(key, month);
  return { posted, rules: rules.rules.length };
});
