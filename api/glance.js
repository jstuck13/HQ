// GET /api/glance?of=day|reading → everything a Home Screen widget draws, in one small document.
//
// An installed web app cannot put a tile on the iOS Home or Lock Screen; only a native widget can, and no amount
// of manifest will buy it. So this is what the widget in Scriptable reads. One endpoint rather than one per face:
// the payload is a couple of KB and a widget refreshes a few dozen times a day, so splitting it would buy nothing
// and leave a route per face to keep in step.
//
// Every reply is finished rather than raw — hours resolved, text chosen, lateness and pace already worked out.
// A widget redraws on the system's own schedule and gets no chance to ask a follow-up question, so anything it
// would have had to work out itself is worked out here.
//
// `day` has a shape of its own, because its rows are tappable and carry their own text. Every other face answers
// in the same envelope — { title, big, lines, foot } — so the widget draws them all with one renderer, and a new
// face is a function here rather than another page of drawing code there.
import { sql, ensureTable, isAuthed, localNow } from './_lib.js';

const wd = iso => new Date(iso + 'T12:00:00Z').getUTCDay();
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);

// ponytail: the occurrence rule is a second copy of the one today.html draws with (renderDay). recur.js is a
// browser global rather than a module, so the server cannot import it; when it becomes ESM, both should call it.
// Keep the two in step: a weekly entry repeats on its named days once its start date has passed.
const repDays = s => [...new Set([wd(s.date), ...(s.rep || [])])];
const occursOn = (s, day) => (s.rep || []).length ? (day >= s.date && repDays(s).includes(wd(day))) : s.date === day;

// ---- the day: the one face with rows you can tick ----

// Pure, and exported, so the tests can ask it what it makes of a day without a database anywhere near them —
// the handler below is only the part that fetches.
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
    face: 'day', day, h: Math.round(h * 100) / 100,
    open: todos.filter(i => !i.done).length,
    done: todos.filter(i => i.done).length,
    todos,
    events,
    now: events.find(e => e.live) || null,
    next: events.find(e => e.start > h) || null,
    word: w && w.w ? { w: w.w, pos: w.pos || null, def: w.def } : null,
  };
};

// ---- the faces that share one envelope ----
// `tone` is the only styling the server decides, because what counts as alarming is a fact about the figure and
// not about the drawing: 'over' is past a limit or a deadline, 'near' is close enough to act on.

// ponytail: the same formula as coverURL in library.html, which is a browser script the server cannot import.
// Open Library serves these by its own cover id, or by ISBN when a book was added without one. `default=false`
// makes a missing cover a 404 rather than a grey placeholder, so the widget can tell and fall back to type.
const coverURL = b => b.coverId ? `https://covers.openlibrary.org/b/id/${b.coverId}-L.jpg?default=false`
  : b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false` : null;

// The book on the go, how far in, and whether the week's reading says you will finish it.
export const faceReading = (lib, day) => {
  const book = (lib.books || []).find(b => b.shelf === 'reading');
  if (!book) return { face: 'reading', day, title: 'Library', big: null, lines: [], foot: 'Nothing on the go.' };

  const page = +book.page || 0, pages = +book.pages || 0, log = book.log || {};
  // pages gained in the last seven days, read off the log's own jumps rather than stored anywhere
  let got = 0, was = null;
  for (const d of Object.keys(log).sort()) {
    const p = +log[d];
    const n = daysBetween(d, day);
    if (was != null && n >= 0 && n < 7 && p > was) got += p - was;
    was = p;
  }
  const left = pages ? pages - page : null;
  const lines = [];
  if (pages) lines.push({ t: 'Page', v: String(page), note: 'of ' + pages });
  lines.push({ t: 'This week', v: `${got} ${got === 1 ? 'page' : 'pages'}` });
  if (left != null && left > 0 && got > 0) lines.push({ t: 'At this pace', v: Math.ceil(left / (got / 7)) + ' days' });
  if (left != null && left <= 0) lines.push({ t: 'Finished', v: 'the last page', tone: 'good' });

  return {
    face: 'reading', day,
    title: book.title,
    sub: book.author || null,
    cover: coverURL(book),             // the jacket, where there is room for it          // the identity is the book; the author is the second line of it, never a
                                       // caption for a number — "38% / Andy Weir" reads as if he were the figure
    big: pages ? { v: Math.round(page / pages * 100) + '%', k: 'through' } : null,
    bar: pages ? Math.min(1, page / pages) : null,   // a glance wants a length, not a number to interpret
    lines,
    foot: log[day] ? null : 'Nothing logged today.',
  };
};

// Which documents each face needs, and what it makes of them. A new face is an entry here.
export const FACES = {
  day:     { keys: d => ['today.' + d, 'calendar', 'daily'],
             build: (docs, d, h) => glanceFrom({ todo: docs['today.' + d], cal: docs.calendar, daily: docs.daily }, d, h) },
  reading: { keys: () => ['library'], build: (docs, d) => faceReading(docs.library || {}, d) },
};

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }

  const of = String(req.query.of || 'day').toLowerCase();
  const face = FACES[of];
  if (!face) return res.status(400).json({ error: 'no such face', faces: Object.keys(FACES) });

  const { date: day, h } = localNow();
  await ensureTable();
  const keys = face.keys(day);
  const rows = await sql`SELECT key, data FROM documents WHERE key = ANY(${keys})`;
  const docs = Object.fromEntries(rows.map(r => [r.key, r.data]));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(face.build(docs, day, h));
}
