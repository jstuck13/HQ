// GET /api/glance → everything a Home Screen widget draws, in one small document.
//
// An installed web app cannot put a tile on the iOS Home or Lock Screen; only a native widget can, so the
// widget lives in Scriptable and reads this. It sends the same session cookie the browser holds, which is why
// there is no second kind of credential here — see hq-widget.js for the phone half.
//
// The reply is deliberately finished rather than raw: text already chosen, hours already resolved, nothing the
// widget has to compute. A widget redraws on the system's schedule with no chance to ask a follow-up question,
// so anything it would have had to work out itself is worked out here instead.
import { sql, ensureTable, isAuthed, localNow } from './_lib.js';

const wd = iso => new Date(iso + 'T12:00:00Z').getUTCDay();

// ponytail: the occurrence rule is a second copy of the one today.html draws with (renderDay). recur.js is a
// browser global rather than a module, so the server cannot import it; when it becomes ESM, both should call it.
// Keep the two in step: a weekly entry repeats on its named days once its start date has passed.
const repDays = s => [...new Set([wd(s.date), ...(s.rep || [])])];
const occursOn = (s, day) => (s.rep || []).length ? (day >= s.date && repDays(s).includes(wd(day))) : s.date === day;

// The whole reading, out of the three documents it takes. Pure, and exported, so the tests can ask it what it
// makes of a day without a database anywhere near them — the handler below is only the part that fetches.
export const glanceFrom = ({ todo = {}, cal = {}, daily = {} }, day, h) => {
  // A to-do carries no id — the day's list is spliced by rollover, skipping and removal, so an index would not
  // survive the gap between the widget drawing a row and your thumb landing on it. The text is what you tapped
  // and what today.html looks for in return.
  const todos = (todo.items || []).map(i => ({
    text: i.text,
    at: i.at ?? null,
    done: !!i.done,
    late: !i.done && i.at != null && i.at < h,
    due: i.due || null,
  }));

  const events = (cal.series || [])
    .filter(s => s.date && occursOn(s, day) && !(cal.hidden || []).includes(s.cat))
    .sort((a, b) => a.start - b.start)
    .map(s => ({ title: s.title, start: s.start, end: s.end, live: s.start <= h && s.end > h }));

  const w = daily.word;
  return {
    day, h: Math.round(h * 100) / 100,
    open: todos.filter(i => !i.done).length,
    done: todos.filter(i => i.done).length,
    todos,
    events,
    now: events.find(e => e.live) || null,
    next: events.find(e => e.start > h) || null,
    word: w && w.w ? { w: w.w, pos: w.pos || null, def: w.def } : null,
  };
};

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }

  const { date: day, h } = localNow();
  await ensureTable();
  const keys = ['today.' + day, 'calendar', 'daily'];
  const rows = await sql`SELECT key, data FROM documents WHERE key = ANY(${keys})`;
  const doc = k => (rows.find(r => r.key === k) || {}).data || {};

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(glanceFrom({ todo: doc('today.' + day), cal: doc('calendar'), daily: doc('daily') }, day, h));
}
