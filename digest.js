// A span of days, written out. The week page uses it for seven days, the longer view for a month or a year;
// it reads off the same documents every page is drawn from, says only what the numbers say, compares with the
// span before where that is honest, and leaves out whatever is missing rather than padding it. No encouragement
// either — a thin month should read like one.
//
// hqDigest({ H, school, lib, fin, days, prev, months, span }) → an array of HTML paragraphs.
// `span` is 'week' | 'month' | 'year', and only changes how things are worded and what is worth saying.
(function () {
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $0 = n => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  const hrs = m => m >= 60 ? (m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`) : `${m} min`;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

  window.hqDigest = function ({ H, school, lib, fin, days, prev, months, todos, span = 'week', today }) {
    const C = window.clock, TODAY = today || C.today;
    const inSpan = (d, ds) => d >= ds[0] && d <= ds[ds.length - 1];
    const vals = (ds, k) => ds.map(d => +((H && H.days && H.days[d] || {})[k])).filter(v => v > 0);
    const before = span === 'week' ? 'the week before' : span === 'month' ? 'the month before' : 'the year before';
    const move = (now, then, step, fmt = v => v.toFixed(1)) => {
      if (then == null || !isFinite(then)) return '';
      const d = now - then;
      if (Math.abs(d) < step) return `, much as ${before}`;
      return `, ${d > 0 ? 'up' : 'down'} ${fmt(Math.abs(d))} on ${before}`;
    };
    const ps = [];

    // 1 · the nights, and what you made of them
    { const sl = vals(days, 'sleep'), pv = vals(prev, 'sleep');
      if (sl.length) {
        const m = mean(sl), lo = Math.min(...sl), hi = Math.max(...sl);
        let t = `You slept <b>${m.toFixed(1)} hours</b> a night across ${sl.length} ${sl.length === 1 ? 'night' : 'nights'}${pv.length ? move(m, mean(pv), 0.2) : ''}`;
        if (sl.length > 1) t += `. The shortest was ${lo.toFixed(1)} and the longest ${hi.toFixed(1)}`;
        const e = vals(days, 'energy'), mo = vals(days, 'mood');
        if (e.length || mo.length) t += `, and you rated the days ${e.length ? `<b>${mean(e).toFixed(1)}</b> for energy` : ''}${e.length && mo.length ? ' and ' : ''}${mo.length ? `<b>${mean(mo).toFixed(1)}</b> for mood` : ''} out of five`;
        else t += `. You did not rate how any of them felt`;
        ps.push(t + '.');
      } }

    // 2 · what went out, and over a longer span which way each kind of spending drifted
    { const tx = months.flatMap(m => (fin[m] && fin[m].tx) || []).filter(t => inSpan(t.date, days));
      const pv = months.flatMap(m => (fin[m] && fin[m].tx) || []).filter(t => inSpan(t.date, prev));
      if (tx.length) {
        const total = tx.reduce((n, t) => n + t.amt, 0), ptotal = pv.reduce((n, t) => n + t.amt, 0);
        const by = list => { const o = {}; list.forEach(t => { o[t.cat] = (o[t.cat] || 0) + t.amt; }); return o; };
        const cats = by(tx), pcats = by(pv);
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        const nameOf = id => { for (const m of months) { const c = (fin[m] && fin[m].cats || []).find(c => c.id === id); if (c) return c.name; } return 'something'; };
        const big = [...tx].sort((a, b) => b.amt - a.amt)[0];
        let t = `You spent <b>${$0(total)}</b> over ${tx.length} ${tx.length === 1 ? 'purchase' : 'purchases'}${pv.length ? `, against ${$0(ptotal)} ${before}` : ''}. Most of it went on ${esc(nameOf(top[0]).toLowerCase())} (${$0(top[1])})`;
        if (span === 'week' && big && big.amt > total / 3 && Math.abs(big.amt - top[1]) > 0.01) t += `, and the largest single thing was ${esc(big.what || 'one purchase')} at ${$0(big.amt)}`;
        if (span !== 'week' && Object.keys(pcats).length) {
          const drift = Object.entries(cats).map(([id, v]) => [id, v - (pcats[id] || 0)]).filter(([, d]) => Math.abs(d) >= Math.max(25, total * 0.04)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2);
          if (drift.length) t += `. ${drift.map(([id, d]) => `${esc(nameOf(id))} ${d > 0 ? 'rose' : 'fell'} ${$0(Math.abs(d))}`).join(', ')}`;
        }
        ps.push(t + '.');
      } }

    // 3 · the list, and any target set against it. A target you log against and never hear about again is a
    //     measurement with no feedback, which is the surest way to stop logging it.
    if (todos && todos.length) {
      const items = todos.flatMap(t => (t && t.items) || []);
      if (items.length) {
        const done = items.filter(i => i.done).length;
        let t = `You ticked <b>${done} of ${items.length}</b> ${items.length === 1 ? 'thing' : 'things'} off the list`;
        // every target that appeared, by what it was for: the days it was met out of the days it was asked
        const by = {};
        todos.forEach(doc => ((doc && doc.items) || []).forEach(i => {
          if (!i.target || !i.target.n) return;
          const key = `${i.text}|${i.target.n}|${i.target.unit}`;
          (by[key] ??= { text: i.text, n: i.target.n, unit: i.target.unit, asked: 0, met: 0, sum: 0 });
          by[key].asked++; by[key].sum += +i.did || 0;
          if (i.done || (+i.did || 0) >= i.target.n) by[key].met++;
        }));
        const hit = Object.values(by).filter(x => x.asked > 1)
          .sort((a, b) => b.asked - a.asked).slice(0, 2)
          .map(x => `${esc(x.text)} on <b>${x.met} of ${x.asked}</b> days${x.sum ? ` (${+x.sum.toFixed(1)} ${esc(x.unit)} in all)` : ''}`);
        if (hit.length) t += `. You hit ${hit.join(', and ')}`;
        ps.push(t + '.');
      }
    }

    // 4 · school: what was owed, what was done, and where the mark went
    if (school) {
      const due = (school.items || []).filter(i => i.due && !i.noturn && inSpan(i.due, days));
      const done = due.filter(i => i.done).length, slipped = due.filter(i => !i.done && i.due < TODAY).length;
      const mins = (school.sessions || []).filter(x => inSpan(x.date, days)).reduce((n, x) => n + x.min, 0);
      const pmins = (school.sessions || []).filter(x => inSpan(x.date, prev)).reduce((n, x) => n + x.min, 0);
      if (due.length || mins) {
        let t = due.length ? `<b>${done} of ${due.length}</b> ${due.length === 1 ? 'thing was' : 'things were'} due and done${slipped ? `, and <b>${slipped}</b> ${slipped === 1 ? 'has' : 'have'} slipped past` : ''}` : 'Nothing fell due';
        t += mins ? `. You studied for <b>${hrs(mins)}</b>${pmins ? `, against ${hrs(pmins)} ${before}` : ''}` : '. Nothing was studied';
        const marks = (school.courses || []).map(c => {
          const h = (c.marks || []).filter(m => m.pct != null); if (!c.mark || h.length < 2) return null;
          const was = h.filter(m => m.d < days[0]).pop() || h[0]; if (!was || was.d > days[days.length - 1]) return null;
          const d = c.mark.pct - was.pct; if (Math.abs(d) < 0.5) return null;
          return `${esc(c.name)} ${d > 0 ? 'rose' : 'fell'} ${Math.abs(d).toFixed(1)} to ${Math.round(c.mark.pct)}%`;
        }).filter(Boolean);
        if (marks.length) t += `. ${marks.join(', ')}`;
        ps.push(t + '.');
      } }

    // 5 · the phone
    { const raw = days.map(d => +((H && H.days && H.days[d] || {}).opens)).map(v => v > 0 ? v : null);
      const got = raw.filter(v => v != null), pv = vals(prev, 'opens');
      if (got.length) {
        const m = mean(got), worst = days[raw.indexOf(Math.max(...got))];
        ps.push(`You reached for the phone <b>${Math.round(m)} times</b> a day${pv.length ? move(m, mean(pv), 1, v => Math.round(v) + ' times') : ''}. The heaviest was ${span === 'week' ? C.dayName(C.fromISO(worst)) : C.dayMonth(C.fromISO(worst))}, at ${Math.max(...got)}.`);
      } }

    // 6 · reading; over a longer span, what was actually finished
    { const pages = (lib && lib.books || []).reduce((n, b) => {
        const log = Object.entries(b.log || {}).sort(); let was = null, got = 0;
        for (const [d, pg] of log) { if (was != null && inSpan(d, days) && +pg - was > 0) got += +pg - was; was = +pg; }
        return n + got; }, 0);
      const reading = (lib && lib.books || []).find(b => b.shelf === 'reading');
      const fin2 = (lib && lib.books || []).filter(b => b.shelf === 'read' && b.finished && inSpan(b.finished, days));
      let t = '';
      if (pages) t = `You read <b>${pages} pages</b>${reading ? ` of ${esc(reading.title)}, which stands at page ${reading.page || 0}${reading.pages ? ` of ${reading.pages}` : ''}` : ''}`;
      else if (reading) t = `${esc(reading.title)} did not move from page ${reading.page || 0}`;
      if (fin2.length) t += `${t ? ', and you finished ' : 'You finished '}${fin2.length === 1 ? esc(fin2[0].title) : `<b>${fin2.length} books</b>`}`;
      if (t) ps.push(t + '.');
    }

    // 7 · what the sky did, and what it did to the light
    { const wx = days.map(d => (H && H.days && H.days[d] || {}).wx).filter(Boolean);
      if (wx.length >= 3) {
        const his = wx.map(w => w.hi).filter(v => v != null), wet = wx.filter(w => w.rain > 0.04).length;
        const dl = wx.map(w => w.daylight).filter(v => v != null);
        let t = `Outside it reached <b>${Math.round(mean(his))}°</b> on an average day, and it rained on ${wet === 0 ? 'none of them' : wet === wx.length ? 'every one' : `${wet} of ${wx.length}`}`;
        if (dl.length >= 2) { const lost = (dl[0] - dl[dl.length - 1]) * 60;
          if (Math.abs(lost) >= 4) t += `. The days ${lost > 0 ? 'lost' : 'gained'} ${Math.round(Math.abs(lost))} minutes of light${span === 'week' ? ' across the week' : span === 'month' ? ' over the month' : ' across the year'}`; }
        ps.push(t + '.');
      } }

    return ps;
  };
})();
