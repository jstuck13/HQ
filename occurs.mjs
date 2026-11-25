// Does a calendar entry fall on a given day?
//
// An entry with no `rep` happens once, on its own date. An entry with `rep` — a list of weekday numbers —
// comes back every week on those days, and on the weekday of its own start date, from that date onward.
//
// This rule had five copies: calendar.html, today.html, day.html, review.html and api/glance.js, the last of
// which carried a comment admitting it. Five readings of "is this on today" is five chances to disagree about
// it, and the one on the server was already drifting — it had no `.sort()`, which did not matter, but nothing
// said it would go on not mattering.
//
// It is an ES module so the server can import it, and the pages load it with type="module" and read it off
// window. Every call site is inside a render function, so the deferral a module brings costs nothing.

export const weekdayOf = iso => new Date(iso + 'T12:00:00Z').getUTCDay();

export const isWeekly = s => (s.rep || []).length > 0;

// the days it comes back on: the ones ticked, plus the weekday its own start date falls on
export const repDays = s => [...new Set([weekdayOf(s.date), ...(s.rep || [])])].sort();

export const occursOn = (s, day) =>
  isWeekly(s) ? (day >= s.date && repDays(s).includes(weekdayOf(day))) : s.date === day;

// the browser reads it off window; Node imports the names above
if (typeof window !== 'undefined') window.hqOccurs = { weekdayOf, isWeekly, repDays, occursOn };
