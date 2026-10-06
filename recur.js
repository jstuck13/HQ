// How often a standing item comes back, and how that is said. Shared, because Today writes these and The List
// reads them, and a second copy of the wording is a second copy to keep right.
//
//   rep is 'daily' | 'weekdays' | 0–6 (a weekday) | { every: n, from: 'YYYY-MM-DD' }
(function () {
  const DAYNAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const everyWord = n => n === 2 ? 'other' : n === 3 ? 'third' : n === 4 ? 'fourth' : `${n}th`;

  window.hqRecur = {
    DAYNAMES,
    says: rep => rep && rep.every
      ? (rep.every === 2 ? 'every other day' : `every ${everyWord(rep.every)} day`)
      : rep === 'daily' ? 'every day'
      : rep === 'weekdays' ? 'every weekday'
      : rep == null ? ''
      : `every ${DAYNAMES[rep][0].toUpperCase()}${DAYNAMES[rep].slice(1)}`,
    // is a given day one of this rule's days? a period counts from the day it started
    on: (rep, iso) => {
      const C = window.clock;
      if (rep && rep.every) { const n = C.daysBetween(rep.from || iso, iso); return n >= 0 && n % rep.every === 0; }
      const wd = C.fromISO(iso).getDay();
      return rep === 'daily' || (rep === 'weekdays' && wd >= 1 && wd <= 5) || rep === wd;
    },
    // How many times a to-do was actually asked of you, which is not how many mornings it sat in front of you.
    // Rollover copies an unticked to-do into the next day while it stays unticked, stamping `from` with the day
    // it was first written; those copies are the same load of laundry put off, not another load. A standing
    // item is different: its rule asks again every day it falls on, so there each day is its own asking.
    //   days: [{ day, from, done, did }] in day order, standing: true for a rule-backed to-do
    //   → [{ made, last, settled, done, did, waited }], one per asking
    askings: (days, standing) => {
      if (standing) return days.map(d => ({ made: d.day, last: d.day, settled: d.done ? d.day : null, done: !!d.done, did: +d.did || 0, waited: 0 }));
      const C = window.clock, by = new Map();
      for (const d of days) {
        const made = d.from || d.day;
        const o = by.get(made) || { made, last: d.day, settled: null, done: false, did: 0, waited: 0 };
        o.last = d.day;                                   // the last morning this one was still there
        if (d.done) { o.done = true; o.settled = d.day; }
        if (+d.did > o.did) o.did = +d.did;
        o.waited = C.daysBetween(made, o.settled || o.last);
        by.set(made, o);
      }
      return [...by.values()].sort((a, b) => a.made < b.made ? -1 : 1);
    },
    // A rule keeps what happened, a day at a time: 1 kept, 0 let go, and only for days you answered — a day you
    // never opened HQ is not held against you. Both Today and The List tick these, so both write it the same way.
    mark: (rule, day, kept) => {
      if (!rule) return false;
      rule.log ??= {}; rule.log[day] = kept ? 1 : 0;
      const ks = Object.keys(rule.log).sort();
      if (ks.length > 120) ks.slice(0, ks.length - 120).forEach(k => delete rule.log[k]);
      return true;
    },
    // A span of days read as things, and the times each was asked for.
    //   docs: [dayDocument | null] running parallel to days: ['YYYY-MM-DD']
    //   → [{ text, standing, target, days, asks }]
    tally: (docs, days) => {
      const things = new Map();
      (docs || []).forEach((doc, i) => ((doc && doc.items) || []).forEach(it => {
        if (!it || !it.text) return;
        const k = (it.rule ? 'r|' : 't|') + it.text.trim().toLowerCase();
        const g = things.get(k) || { text: it.text, standing: !!it.rule, target: null, days: [] };
        if (it.target && it.target.n) g.target = it.target;
        g.days.push({ ...it, day: days[i] }); things.set(k, g);
      }));
      return [...things.values()].map(g => ({ ...g, asks: window.hqRecur.askings(g.days, g.standing) }));
    },
    // the next few days it would fall on, which is the only way to see a period's phase before it is wrong
    next: (rep, from, n = 3) => {
      const C = window.clock, out = [];
      for (let i = 0; i < 90 && out.length < n; i++) { const d = C.iso(C.addDays(C.fromISO(from), i)); if (window.hqRecur.on(rep, d)) out.push(d); }
      return out;
    },
  };
})();
