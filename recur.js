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
    // the next few days it would fall on, which is the only way to see a period's phase before it is wrong
    next: (rep, from, n = 3) => {
      const C = window.clock, out = [];
      for (let i = 0; i < 90 && out.length < n; i++) { const d = C.iso(C.addDays(C.fromISO(from), i)); if (window.hqRecur.on(rep, d)) out.push(d); }
      return out;
    },
  };
})();
