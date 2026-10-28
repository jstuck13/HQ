// HQ's Home Screen widget, for Scriptable on iOS.
//
// An installed web app can never put a tile on the iOS Home or Lock Screen — that is a native privilege, and no
// amount of manifest will buy it. So this is the one piece of HQ that does not live in the browser: paste it into
// a new script in Scriptable (free, App Store), run it once to hand over the passcode, then add a Scriptable
// widget to the Home Screen and choose "HQ" in its settings.
//
// It reads /api/glance and draws. It computes nothing: the endpoint already resolved the hours, chose the text and
// worked out what is late, because a widget redraws on the system's own schedule and gets no chance to ask a
// follow-up question. Tapping a to-do opens today.html?tick=<its text>, which ticks it and lands you on Today.
//
// One script, any number of widgets. Add it to the Home Screen as many times as you like and put a face in each
// one's Parameter field (long-press -> Edit Widget -> Parameter):
//
//     day       (or blank)  what is open, what is next, and the word
//     reading               the book on the go, how far through, and whether the week's pace finishes it
//
// Sizes: small is the one thing that matters next; medium adds rows or statistics; large has room for the jacket
// and the lot; the Lock Screen rectangle gets one line. Nothing here needs editing; the passcode is kept in the
// iOS keychain, never in this file, so the script is safe to paste anywhere.
//
// The layouts were designed in tools/widget-preview.html, which draws these same tiles at iOS point sizes in a
// browser. The two are transcriptions of each other and must be changed together.

const SITE = 'https://hq-six-puce.vercel.app';
const KEY = 'hq.passcode';
// which widget this one is. Scriptable gives each placed instance its own parameter, so one script serves all.
const FACE = String((typeof args !== 'undefined' && args.widgetParameter) || 'day').trim().toLowerCase() || 'day';

// HQ's own palette, from hq.css. The widget is a piece of the same object as the pages.
const C = {
  band: new Color('#1F3A2E'), bandInk: new Color('#F2ECDF'), bandMuted: new Color('#B9C9BE'),
  paper: new Color('#F5F0E6'), ink: new Color('#1E1B16'), ink3: new Color('#6A6256'),
  rule: new Color('#D3C9B6'), ox: new Color('#C29B99'), sage: new Color('#C9D6CE'), wheat: new Color('#D9C79A'),
};
const SERIF = n => new Font('Georgia', n);            // Libre Caslon is not on the phone; Georgia is its stand-in
const SANS = n => Font.systemFont(n);
const SANS_B = n => Font.semiboldSystemFont(n);

// 18.5 → "6.30 pm". The same twelve-hour shape the pages use; HQ never shows a 24-hour clock.
const h12 = h => {
  if (h == null) return '';
  const hr = Math.floor(h), m = Math.round((h % 1) * 60);
  return `${hr % 12 || 12}.${String(m).padStart(2, '0')} ${hr < 12 ? 'am' : 'pm'}`;
};

// The passcode is asked for once, in Scriptable, and kept in the keychain. The session cookie is an HMAC the
// server can verify without storing anything, so the widget signs in the same way the browser did and holds
// nothing else. Run the script by hand (not as a widget) to set or change it.
async function passcode() {
  if (Keychain.contains(KEY)) return Keychain.get(KEY);
  if (config.runsInWidget) return null;              // a widget cannot prompt; it shows the sign-in state instead
  const a = new Alert();
  a.title = 'HQ passcode';
  a.message = 'Kept in this phone’s keychain, and sent only to ' + SITE + '.';
  a.addSecureTextField('passcode', '');
  a.addAction('Save'); a.addCancelAction('Cancel');
  if (await a.presentAlert() !== 0) return null;
  const p = a.textFieldValue(0).trim();
  if (!p) return null;
  Keychain.set(KEY, p);
  return p;
}

async function glance() {
  const p = await passcode();
  if (!p) return { error: 'Run the HQ script once to sign in.' };
  // POST the passcode for a cookie, then read the glance with it. Two short requests beats keeping a derived
  // token here: change PASSCODE on the server and this stops working, which is the behaviour you want.
  try {
    const login = new Request(SITE + '/api/login');
    login.method = 'POST';
    login.headers = { 'Content-Type': 'application/json' };
    login.body = JSON.stringify({ passcode: p });
    await login.loadJSON();
    const set = login.response.headers['set-cookie'] || login.response.headers['Set-Cookie'] || '';
    const hq = String(set).match(/hq=([a-f0-9]+)/);
    if (!hq) return { error: 'Wrong passcode. Run the HQ script to set it again.' };

    const r = new Request(`${SITE}/api/glance?of=${encodeURIComponent(FACE)}`);
    r.headers = { Cookie: 'hq=' + hq[1] };
    const data = await r.loadJSON();
    if (data && data.error) return { error: data.error };
    return data;
  } catch (e) {
    return { error: 'HQ did not answer.' };
  }
}

// ---- drawing ----

const pad = (w, n) => { w.setPadding(n, n, n, n); return w; };

// How big a tile actually is. iOS gives widgets different point sizes on different phones — a large tile is
// 338x354 on a 390pt screen and 364x382 on a Pro Max — and a layout written for the smaller one leaves a third
// of the bigger one empty. Scriptable will not measure a widget for you, but it will tell you the screen, and
// the sizes follow from that.
const TILES = [
  [428, { small: 170, medium: 364, large: 364, tall: 382 }],   // Pro Max and Plus
  [414, { small: 169, medium: 360, large: 360, tall: 379 }],   // the older Plus bodies
  [390, { small: 158, medium: 338, large: 338, tall: 354 }],   // most of them
  [375, { small: 155, medium: 329, large: 329, tall: 345 }],
  [0,   { small: 141, medium: 292, large: 292, tall: 311 }],   // the small bodies, and the fallback
];
function tile(fam) {
  let width = 390;
  try { width = Math.round(Device.screenSize().width); } catch (e) {}
  const T = (TILES.find(([w]) => width >= w) || TILES[TILES.length - 1])[1];
  if (fam === 'small') return { w: T.small, h: T.small };
  if (fam === 'large') return { w: T.large, h: T.tall };
  return { w: T.medium, h: T.small };            // a medium is exactly a small's height
}
// the usable room inside, after the padding, with a few points held back: a stack given exactly the space
// available overflows on the first rounding, widening its parent and shoving everything beside it out of place
const inner = fam => tile(fam).w - 28 - 8;
const innerH = fam => tile(fam).h - 28;

// width 0 means "automatic" in Scriptable, and a stack with no children is then no width at all — this hairline
// was never drawing. It is given the measurement outright.
function rule(w, width) { const r = w.addStack(); r.size = new Size(width, 1); r.backgroundColor = C.rule; }

function heading(w, g) {
  const row = w.addStack();
  row.centerAlignContent();
  const t = row.addText('HQ');
  t.font = SERIF(13); t.textColor = C.bandMuted;
  if (g.open == null) return;              // only the day counts anything in its heading
  row.addSpacer();
  const n = row.addText(g.open === 0 ? 'clear' : `${g.open} open`);
  n.font = SANS_B(12); n.textColor = g.open === 0 ? C.sage : C.bandInk;
}

// One to-do. The whole row is the tap target and carries its own url, so a thumb ticks the thing it is on
// rather than opening the page and hunting for it.
function todoRow(w, it) {
  const row = w.addStack();
  row.centerAlignContent();
  row.url = `${SITE}/today.html?tick=${encodeURIComponent(it.text)}`;
  const box = row.addImage(tickbox(12, it.late ? C.ox : C.bandMuted));
  box.imageSize = new Size(12, 12);
  row.addSpacer(7);
  const t = row.addText(it.text);
  t.font = SANS(13); t.textColor = C.bandInk; t.lineLimit = 1;
  row.addSpacer();
  if (it.at != null) {
    const at = row.addText(h12(it.at));
    at.font = SANS(11); at.textColor = it.late ? C.ox : C.bandMuted;
  }
}

function eventLine(w, e, label) {
  const row = w.addStack();
  row.centerAlignContent();
  const d = row.addImage(dot(e.live ? 7 : 5, e.live ? C.sage : C.bandMuted));
  d.imageSize = new Size(e.live ? 7 : 5, e.live ? 7 : 5);
  row.addSpacer(7);
  const t = row.addText(`${e.title}`);
  t.font = SERIF(13); t.textColor = C.bandInk; t.lineLimit = 1;
  row.addSpacer();
  const at = row.addText(label || h12(e.start));
  at.font = SANS(11); at.textColor = C.bandMuted;
}

function empty(w, line) {
  const t = w.addText(line);
  t.font = SERIF(14); t.textColor = C.bandMuted;
}

// ---- the pieces the envelope faces are drawn from ----

// How far through, as a length. Scriptable has no bar, so it is a track stack with a filled one inside it.
function progress(w, frac, width) {
  const track = w.addStack();
  track.size = new Size(width, 3);
  track.backgroundColor = new Color('#F2ECDF', 0.18);
  track.cornerRadius = 2;
  const fill = track.addStack();
  fill.size = new Size(Math.min(width, Math.max(2, Math.round(width * Math.min(1, Math.max(0, frac))))), 3);
  fill.backgroundColor = C.bandMuted;
  fill.cornerRadius = 2;
}

// HQ's mark for a thing with nothing in it: a lozenge between two rules. The pages draw it, so the tiles do too —
// an empty tile should read as the same object as an empty page, not as one that failed to load.
function ornament(w, width) {
  const row = w.addStack();
  row.centerAlignContent();
  const arm = () => { const a = row.addStack(); a.size = new Size(Math.round(width / 3), 1); a.backgroundColor = C.bandMuted; };
  row.addSpacer();
  arm(); row.addSpacer(8);
  const d = row.addImage(lozenge(7, C.bandMuted)); d.imageSize = new Size(7, 7);
  row.addSpacer(8); arm();
  row.addSpacer();
}

// The jacket. Open Library answers 404 rather than a placeholder (default=false), so a book it has never seen
// simply has no cover and the tile falls back to type. Covers do not change, so one is kept on the phone.
async function jacket(url) {
  if (!url) return null;
  try {
    const fm = FileManager.local();
    const dir = fm.joinPath(fm.cacheDirectory(), 'hq-covers');
    if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
    const path = fm.joinPath(dir, url.replace(/\W+/g, '_').slice(-60) + '.jpg');
    if (fm.fileExists(path)) return fm.readImage(path);
    const img = await new Request(url).loadImage();
    fm.writeImage(path, img);
    return img;
  } catch (e) { return null; }
}

function statLine(w, l, width) {
  const row = w.addStack();
  row.centerAlignContent();
  if (width) row.size = new Size(width, 0);   // a row left to size itself can push its container wider
  const t = row.addText(l.t);
  t.font = SANS(12.5); t.textColor = C.bandMuted; t.lineLimit = 1;
  row.addSpacer();
  const v = row.addText(String(l.v));
  v.font = SANS(12.5);
  v.textColor = l.tone === 'over' ? C.ox : l.tone === 'near' ? C.wheat : l.tone === 'good' ? C.sage : C.bandInk;
  if (l.note) { row.addSpacer(4); const n = row.addText(l.note); n.font = SANS(11); n.textColor = C.bandMuted; }   // a word space: "180 of 476" is one phrase
}

// ---- any face but the day: title, a figure, some lines, a closing sentence ----
async function drawFace(w, g, fam) {
  const lock = fam === 'accessoryRect' || fam === 'accessoryInline';
  const W = inner(fam);

  // nothing to show: the mark, and the one sentence saying so
  if (!g.big && !(g.lines || []).length) {
    if (lock) { const t = w.addText(g.foot || g.title); t.font = SANS_B(13); t.lineLimit = 2; return; }
    if (fam === 'large') { heading(w, g); rule(w, W); }
    w.addSpacer();
    ornament(w, W);
    w.addSpacer(9);
    const t = w.addText(g.foot || 'Nothing yet.');
    t.font = SERIF(13); t.textColor = C.bandMuted; t.centerAlignText();
    w.addSpacer();
    return;
  }

  if (lock) {
    w.backgroundColor = new Color('#1F3A2E', 0);
    const t = w.addText(g.title); t.font = SANS_B(12.5); t.lineLimit = 1;
    if (g.big) { const s2 = w.addText(`${g.big.v} ${g.big.k}`); s2.font = SANS(11); s2.lineLimit = 1; }
    return;
  }

  if (fam === 'small') {
    const t = w.addText(g.title); t.font = SERIF(13.5); t.textColor = C.bandInk; t.lineLimit = 1;
    if (g.sub) { const a = w.addText(g.sub); a.font = SANS(11.5); a.textColor = C.bandMuted; a.lineLimit = 1; }
    if (g.bar != null) { w.addSpacer(9); progress(w, g.bar, W); }
    if (g.big) {
      w.addSpacer(8);
      const b = w.addText(g.big.v); b.font = SERIF(26); b.textColor = C.bandInk;
      const k = w.addText(g.big.k); k.font = SANS(11); k.textColor = C.bandMuted;
    }
    w.addSpacer();
    return;
  }

  if (fam === 'large') {
    heading(w, g); rule(w, W);
    const img = await jacket(g.cover);
    const lines = (g.lines || []).slice(0, 5);

    // Everything is measured back from the tile's real height, so the cover is as large as it can be and the
    // statistics land on the bottom edge. A 2:3 cover cannot fill a nearly-square tile on its own without
    // eating the column beside it, so what it leaves below is exactly the band the statistics sit in.
    const H = innerH(fam);
    const HEAD = 21, GAP = 9, ROW = 21, FOOT = g.foot ? 22 : 0;
    const band = lines.length * ROW + FOOT;
    let coverH = H - HEAD - GAP - band - 10;
    let coverW = Math.round(coverH * 2 / 3);
    const MINCOL = 146;                                  // "At this pace  15 days" needs about this much
    if (coverW > W - 12 - MINCOL) { coverW = W - 12 - MINCOL; coverH = Math.round(coverW * 1.5); }
    const colW = W - coverW - 12;

    const top = w.addStack();
    top.size = new Size(W, img ? coverH : 0);
    if (img) { const i = top.addImage(img); i.imageSize = new Size(coverW, coverH); i.cornerRadius = 2; top.addSpacer(12); }
    const col = top.addStack(); col.layoutVertically(); col.size = new Size(img ? colW : W, 0);
    const t = col.addText(g.title); t.font = SERIF(16); t.textColor = C.bandInk; t.lineLimit = 2;
    if (g.sub) { const a = col.addText(g.sub); a.font = SANS(12); a.textColor = C.bandMuted; a.lineLimit = 1; }
    // the figure hangs off the bottom of the cover rather than sitting straight under the name, so the column
    // is spread across the cover's height instead of bunching at the top of it
    col.addSpacer();
    if (g.big) {
      const b = col.addText(g.big.v); b.font = SERIF(30); b.textColor = C.bandInk;
      const k = col.addText(g.big.k); k.font = SANS(11.5); k.textColor = C.bandMuted;
    }
    if (g.bar != null) { col.addSpacer(8); progress(col, g.bar, img ? colW : W); }

    // the statistics run the full width underneath, where there is room for them to be read as a ledger
    w.addSpacer();
    lines.forEach((l, i) => { if (i) w.addSpacer(4); statLine(w, l, W); });
    if (g.foot) { w.addSpacer(7); const f = w.addText(g.foot); f.font = SERIF(12); f.textColor = C.bandMuted; }
    return;
  }

  // medium. It holds two statistics, or the closing sentence — not both.
  const FIG = 96, CW = W - FIG - 10;
  const top = w.addStack(); top.size = new Size(W, 0);
  const col = top.addStack(); col.layoutVertically(); col.size = new Size(CW, 0);
  const t = col.addText(g.title); t.font = SERIF(15); t.textColor = C.bandInk; t.lineLimit = 1;
  if (g.sub) { const a = col.addText(g.sub); a.font = SANS(11.5); a.textColor = C.bandMuted; a.lineLimit = 1; }
  top.addSpacer();
  if (g.big) {
    const fig = top.addStack(); fig.layoutVertically(); fig.size = new Size(FIG, 0);
    const b = fig.addText(g.big.v); b.font = SERIF(30); b.textColor = C.bandInk; b.rightAlignText();
    const k = fig.addText(g.big.k); k.font = SANS(11); k.textColor = C.bandMuted; k.rightAlignText();
  }
  if (g.bar != null) { w.addSpacer(9); progress(w, g.bar, W); }
  if (!g.foot) { w.addSpacer(9); (g.lines || []).slice(0, 2).forEach((l, i) => { if (i) w.addSpacer(5); statLine(w, l, W); }); }
  else { w.addSpacer(10); const f = w.addText(g.foot); f.font = SERIF(11.5); f.textColor = C.bandMuted; f.centerAlignText(); }
  w.addSpacer();
}

// Where a face is sent. The day has its own drawing because its rows are tappable and carry their own text;
// everything else answers in one envelope and is drawn by drawFace.
const OPENS = { day: '/today.html', reading: '/library.html' };

// ---- drawn marks, not typed ones ----
// A glyph borrowed from the font is not an icon: ○ is the wrong shape for a to-do (the pages draw a square box)
// and ◆ is whatever the system face happens to have. Both are drawn here, at the stroke weight the rest of HQ
// uses, so the tile and the page carry the same marks.

function tickbox(side, color) {
  const dc = new DrawContext();
  dc.size = new Size(side, side);
  dc.opaque = false; dc.respectScreenScale = true;
  dc.setStrokeColor(color); dc.setLineWidth(1);
  dc.strokeRect(new Rect(0.5, 0.5, side - 1, side - 1));
  return dc.getImage();
}

function lozenge(side, color) {
  const dc = new DrawContext();
  dc.size = new Size(side, side);
  dc.opaque = false; dc.respectScreenScale = true;
  const m = side / 2, p = new Path();
  p.move(new Point(m, 0)); p.addLine(new Point(side, m));
  p.addLine(new Point(m, side)); p.addLine(new Point(0, m)); p.closeSubpath();
  dc.setFillColor(color); dc.addPath(p); dc.fillPath();
  return dc.getImage();
}

function dot(side, color) {
  const dc = new DrawContext();
  dc.size = new Size(side, side);
  dc.opaque = false; dc.respectScreenScale = true;
  dc.setFillColor(color); dc.fillEllipse(new Rect(0, 0, side, side));
  return dc.getImage();
}

// ---- the day, as a dial ----
// The ring is the day itself, not a score: it runs from the hour the day starts to the hour it ends, each
// calendar entry is an arc at its own hours, and what is left bare is time that is still yours. Scriptable
// cannot draw SVG and its Path has no arc, so an arc is a polyline of short segments stroked at the ring's
// width — at these sizes the joins are invisible and the result is a true circle, not a rounded polygon.

// The area tints on calendar.html are paper-adjacent and would glare on the band. DESIGN.md keeps a second
// ramp for exactly this: the same hues with the lightness pushed down far enough to sit on a dark ground.
const ARC = {
  cal:    new Color('#A9BBC9'),   // slate
  study:  new Color('#C9B8DB'),   // lilac
  fit:    new Color('#D9C79A'),   // wheat
  health: new Color('#C9A9AE'),   // rose
};
const ARC_FALLBACK = new Color('#9DB4A4');   // sage-mid, for a category you made yourself

// What kind of thing each entry is. HQ's own icons.svg carries calendar / dumbbell / book / heart for exactly
// these four areas; on the phone the same four come from SF Symbols, which is the drawn, weight-consistent set
// the platform already ships. Emoji would be neither consistent nor ours.
const ICON = { cal: 'calendar', study: 'book', fit: 'dumbbell', health: 'heart' };
const ICON_FALLBACK = 'circle.fill';

function arcPath(dc, cx, cy, r, a0, a1, width, color) {
  const sweep = a1 - a0;
  const steps = Math.max(2, Math.ceil(Math.abs(sweep) / 0.045));
  const p = new Path();
  for (let i = 0; i <= steps; i++) {
    const a = a0 + sweep * (i / steps);
    const pt = new Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    if (i === 0) p.move(pt); else p.addLine(pt);
  }
  dc.setStrokeColor(color);
  dc.setLineWidth(width);
  dc.addPath(p);
  dc.strokePath();
}

function dial(g, size) {
  const dc = new DrawContext();
  dc.size = new Size(size, size);
  dc.opaque = false;
  dc.respectScreenScale = true;

  const stroke = Math.max(6, Math.round(size * 0.105));
  const r = (size - stroke) / 2 - 1, cx = size / 2, cy = size / 2;
  const span = g.span || { from: 8, to: 20 };
  const reach = Math.max(1, span.to - span.from);
  // noon at the top would put the working day on its side; the day starts at twelve o'clock and runs round
  const at = h => (-Math.PI / 2) + ((Math.min(span.to, Math.max(span.from, h)) - span.from) / reach) * Math.PI * 2;

  arcPath(dc, cx, cy, r, at(span.from), at(span.to), stroke, new Color('#F2ECDF', 0.14));

  // drawn in the order they begin, so where two entries overlap the later one lies over the earlier
  for (const e of g.events || []) {
    if (e.end <= span.from || e.start >= span.to) continue;
    arcPath(dc, cx, cy, r, at(e.start), at(e.end), stroke, (e.cat && ARC[e.cat]) || ARC_FALLBACK);
  }

  // now: a tick across the ring, in the colour the page draws its now-line with
  if (g.h != null && g.h >= span.from && g.h <= span.to) {
    const a = at(g.h), inner = r - stroke / 2 - 3, outer = r + stroke / 2 + 3;
    const p = new Path();
    p.move(new Point(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner));
    p.addLine(new Point(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer));
    dc.setStrokeColor(new Color('#C29B99'));
    dc.setLineWidth(2);
    dc.addPath(p);
    dc.strokePath();
  }
  return dc.getImage();
}

// The dial, with what the day is made of standing in the middle: one mark per entry, each tinted to its own
// arc, so the centre says what kind of day it is and the ring says when and how long. The count of open to-dos
// used to sit here; the column names the actual thing, which is more use than its number.
function dialStack(into, g, size) {
  const box = into.addStack();
  box.size = new Size(size, size);
  box.backgroundImage = dial(g, size);
  box.layoutVertically();
  box.addSpacer();

  const evs = (g.events || []).slice(0, 6);
  if (!evs.length) {
    const n = box.addText('clear');
    n.font = SERIF(Math.round(size * 0.17));
    n.textColor = C.sage;
    n.centerAlignText();
  } else {
    const sz = Math.max(12, Math.min(21, Math.round(size * 0.15)));
    for (let i = 0; i < evs.length; i += 3) {
      if (i) box.addSpacer(5);
      const row = box.addStack();
      row.centerAlignContent();
      row.addSpacer();
      evs.slice(i, i + 3).forEach((e, k) => {
        if (k) row.addSpacer(6);
        const sym = SFSymbol.named((e.cat && ICON[e.cat]) || ICON_FALLBACK) || SFSymbol.named(ICON_FALLBACK);
        sym.applyFont(Font.systemFont(sz));
        const im = row.addImage(sym.image);
        im.imageSize = new Size(sz, sz);
        im.tintColor = (e.cat && ARC[e.cat]) || ARC_FALLBACK;
        im.resizable = true;
      });
      row.addSpacer();
    }
  }
  box.addSpacer();
  return box;
}

async function build(g) {
  const w = new ListWidget();
  w.backgroundColor = C.band;
  w.url = SITE + (OPENS[g.face] || OPENS[FACE] || '/today.html');
  pad(w, 14);

  if (g.error) {
    const t = w.addText('HQ');
    t.font = SERIF(15); t.textColor = C.bandMuted;
    w.addSpacer(6);
    empty(w, g.error);
    return w;
  }

  const fam = config.widgetFamily || 'medium';
  if (g.face && g.face !== 'day') { await drawFace(w, g, fam); return w; }

  const open = (g.todos || []).filter(i => !i.done);
  const W = inner(fam);

  // The Lock Screen circle is the dial and nothing else — it is the one place the shape needs no explaining.
  if (fam === 'accessoryCircular') {
    w.backgroundColor = new Color('#1F3A2E', 0);
    dialStack(w, g, 52);
    return w;
  }
  if (fam === 'accessoryRect' || fam === 'accessoryInline') {
    w.backgroundColor = new Color('#1F3A2E', 0);
    const t = w.addText(open.length === 0 ? 'Nothing open' : `${open.length} open`);
    t.font = SANS_B(13);
    const nx = g.now || g.next;
    if (nx) { const s2 = w.addText(`${nx.live ? 'now' : h12(nx.start)} · ${nx.title}`); s2.font = SANS(12); s2.lineLimit = 1; }
    return w;
  }

  if (fam === 'small') {
    // the dial, and under it the one thing that is actually next
    const row = w.addStack(); row.size = new Size(W, 0); row.addSpacer();
    dialStack(row, g, Math.min(W, 92));
    row.addSpacer();
    const nx = g.now || g.next;
    w.addSpacer(8);
    if (nx) {
      const t = w.addText(nx.title); t.font = SERIF(13.5); t.textColor = C.bandInk; t.lineLimit = 1; t.centerAlignText();
      const a = w.addText(nx.live ? 'now' : h12(nx.start)); a.font = SANS(11); a.textColor = C.bandMuted; a.centerAlignText();
    } else {
      const t = w.addText('A clear day.'); t.font = SERIF(13); t.textColor = C.bandMuted; t.centerAlignText();
    }
    w.addSpacer();
    return w;
  }

  // ---- medium and large: the dial, and beside it the three things worth knowing ----
  if (fam === 'large') { heading(w, g); rule(w, W); w.addSpacer(10); }

  const D = fam === 'large' ? Math.min(150, W - 170) : Math.min(116, W - 180);
  const top = w.addStack();
  top.size = new Size(W, D);
  top.centerAlignContent();
  dialStack(top, g, D);
  top.addSpacer(16);

  const col = top.addStack(); col.layoutVertically(); col.size = new Size(W - D - 16, 0);
  col.addSpacer();
  const nowE = g.now, nextE = g.next, todo = g.todo;
  keyed(col, 'NOW', nowE ? nowE.title : 'nothing on', nowE ? `until ${h12(nowE.end)}` : null, !!nowE);
  col.addSpacer(9);
  keyed(col, 'NEXT', nextE ? nextE.title : 'nothing more today', nextE ? h12(nextE.start) : null, !!nextE);
  col.addSpacer(9);
  keyed(col, 'TO DO', todo ? todo.text : 'all ticked', todo && todo.at != null ? `by ${h12(todo.at)}` : null, !!todo, todo && todo.late);
  col.addSpacer();

  // Large keeps the tappable rows: a thumb aiming at a named line can tick it without opening anything.
  if (fam === 'large' && open.length) {
    w.addSpacer(12);
    rule(w, W);
    w.addSpacer(10);
    // a large tile has room for six; a quiet day simply stays quiet rather than being padded out
    open.slice(0, 6).forEach((it, i) => { if (i) w.addSpacer(6); todoRow(w, it); });
    if (open.length > 6) {
      w.addSpacer(6);
      const m = w.addText(`and ${open.length - 6} more`); m.font = SANS(11); m.textColor = C.bandMuted;
    }
  }
  w.addSpacer();
  return w;
}

// One labelled fact: the label with the hour riding on it, then the thing itself. The label is the smallest
// type on the tile and the thing the largest, because a label is read once and the thing every time. Two lines
// rather than three — at three the column overran a medium tile.
function keyed(col, label, text, when, present, late) {
  const head = col.addStack();
  head.centerAlignContent();
  const k = head.addText(label);
  k.font = SANS_B(10); k.textColor = C.bandMuted;
  if (when) {
    head.addSpacer(5);
    const a = head.addText('· ' + when);
    a.font = SANS(10); a.textColor = late ? C.ox : C.bandMuted; a.lineLimit = 1;
  }
  head.addSpacer();
  const t = col.addText(text);
  t.font = SERIF(14.5); t.textColor = present ? C.bandInk : C.bandMuted; t.lineLimit = 1;
}

const g = await glance();
const widget = await build(g);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
