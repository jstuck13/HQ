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

function rule(w) { const r = w.addStack(); r.size = new Size(0, 1); r.backgroundColor = C.rule; }

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
  const box = row.addText('○');
  box.font = SANS(12); box.textColor = it.late ? C.ox : C.bandMuted;
  row.addSpacer(6);
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
  const dot = row.addText(e.live ? '●' : '○');
  dot.font = SANS(9); dot.textColor = e.live ? C.sage : C.bandMuted;
  row.addSpacer(6);
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
  fill.size = new Size(Math.max(2, Math.round(width * Math.min(1, Math.max(0, frac)))), 3);
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
  const d = row.addText('◆'); d.font = SANS(7); d.textColor = C.bandMuted;
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

function statLine(w, l) {
  const row = w.addStack();
  row.centerAlignContent();
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
  const WIDE = fam === 'small' ? 130 : 310;

  // nothing to show: the mark, and the one sentence saying so
  if (!g.big && !(g.lines || []).length) {
    if (fam === 'accessoryRect' || fam === 'accessoryInline') {
      const t = w.addText(g.foot || g.title); t.font = SANS_B(13); t.lineLimit = 2; return;
    }
    if (fam === 'large') { heading(w, g); rule(w); }
    w.addSpacer();
    ornament(w, WIDE);
    w.addSpacer(9);
    const t = w.addText(g.foot || 'Nothing yet.');
    t.font = SERIF(13); t.textColor = C.bandMuted; t.centerAlignText();
    w.addSpacer();
    return;
  }

  if (fam === 'accessoryRect' || fam === 'accessoryInline') {
    w.backgroundColor = new Color('#1F3A2E', 0);
    const t = w.addText(g.title); t.font = SANS_B(12.5); t.lineLimit = 1;
    if (g.big) { const s = w.addText(`${g.big.v} ${g.big.k}`); s.font = SANS(11); s.lineLimit = 1; }
    return;
  }

  if (fam === 'small') {
    const t = w.addText(g.title); t.font = SERIF(13.5); t.textColor = C.bandInk; t.lineLimit = 1;
    if (g.sub) { const a = w.addText(g.sub); a.font = SANS(11.5); a.textColor = C.bandMuted; a.lineLimit = 1; }
    if (g.bar != null) { w.addSpacer(9); progress(w, g.bar, WIDE); }
    if (g.big) {
      w.addSpacer(8);
      const b = w.addText(g.big.v); b.font = SERIF(26); b.textColor = C.bandInk;
      const k = w.addText(g.big.k); k.font = SANS(11); k.textColor = C.bandMuted;
    }
    w.addSpacer();
    return;
  }

  if (fam === 'large') {
    heading(w, g); rule(w);
    const top = w.addStack();
    const img = await jacket(g.cover);
    // 150 wide is as large as the jacket goes before a tile with a closing sentence runs over; 2:3 is what Open
    // Library serves and what a hardback is.
    if (img) { const i = top.addImage(img); i.imageSize = new Size(150, 225); i.cornerRadius = 2; top.addSpacer(14); }
    const col = top.addStack(); col.layoutVertically();
    const t = col.addText(g.title); t.font = SERIF(15); t.textColor = C.bandInk; t.lineLimit = 2;
    if (g.sub) { const a = col.addText(g.sub); a.font = SANS(11.5); a.textColor = C.bandMuted; a.lineLimit = 1; }
    if (g.big) {
      col.addSpacer(10);
      const b = col.addText(g.big.v); b.font = SERIF(28); b.textColor = C.bandInk;
      const k = col.addText(g.big.k); k.font = SANS(11); k.textColor = C.bandMuted;
    }
    if (g.bar != null) { col.addSpacer(9); progress(col, g.bar, img ? 146 : WIDE); }
    // in the column, not under the cover: below the jacket they began a long way from the name they belong to,
    // and left the tile with nothing to fill its bottom third
    col.addSpacer();     // the statistics sit on the bottom of the block, not straight under the bar
    (g.lines || []).slice(0, 5).forEach((l, i) => { if (i) col.addSpacer(5); statLine(col, l); });
    if (g.foot) { w.addSpacer(); const f = w.addText(g.foot); f.font = SERIF(11.5); f.textColor = C.bandMuted; }
    return;
  }

  // medium. It holds two statistics, or the closing sentence — not both; one line and a foot still overran.
  // The sentence wins: it is the line that changes what you do.
  const top = w.addStack();
  const col = top.addStack(); col.layoutVertically();
  const t = col.addText(g.title); t.font = SERIF(15); t.textColor = C.bandInk; t.lineLimit = 1;
  if (g.sub) { const a = col.addText(g.sub); a.font = SANS(11.5); a.textColor = C.bandMuted; a.lineLimit = 1; }
  top.addSpacer();
  if (g.big) {
    const fig = top.addStack(); fig.layoutVertically();
    const b = fig.addText(g.big.v); b.font = SERIF(30); b.textColor = C.bandInk; b.rightAlignText();
    const k = fig.addText(g.big.k); k.font = SANS(11); k.textColor = C.bandMuted; k.rightAlignText();
  }
  if (g.bar != null) { w.addSpacer(9); progress(w, g.bar, WIDE); }
  const room = g.foot ? 0 : 2;
  if (room) { w.addSpacer(9); (g.lines || []).slice(0, room).forEach((l, i) => { if (i) w.addSpacer(5); statLine(w, l); }); }
  if (g.foot) { w.addSpacer(); const f = w.addText(g.foot); f.font = SERIF(11.5); f.textColor = C.bandMuted; f.centerAlignText(); }
}

// Where a face is sent. The day has its own drawing because its rows are tappable and carry their own text;
// everything else answers in one envelope and is drawn by drawFace.
const OPENS = { day: '/today.html', reading: '/library.html' };

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

  // The Lock Screen gets one line, because one line is all it has.
  if (fam === 'accessoryRect' || fam === 'accessoryInline') {
    w.backgroundColor = new Color('#1F3A2E', 0);   // the Lock Screen draws its own backdrop; alpha 0, so only the palette matters
    const first = open[0];
    const t = w.addText(open.length === 0 ? 'Nothing open' : `${open.length} open`);
    t.font = SANS_B(13);
    if (first) { const s = w.addText(first.text); s.font = SANS(12); s.lineLimit = 1; }
    return w;
  }

  heading(w, g);
  w.addSpacer(8);

  if (fam === 'small') {
    // room for the one thing that matters next, and nothing else
    const next = g.now || g.next;
    if (open.length) {
      const it = open[0];
      const t = w.addText(it.text);
      t.font = SERIF(16); t.textColor = C.bandInk; t.lineLimit = 3;
      if (it.at != null) { w.addSpacer(4); const at = w.addText(h12(it.at)); at.font = SANS(11); at.textColor = it.late ? C.ox : C.bandMuted; }
      // The small tile opens Today and does not tick. It is one undivided target, so a tap meant for the phone's
      // home screen lands on it as easily as one meant for the to-do — and a tick has no undo on Today. The
      // medium and large sizes tick, because there you are aiming at a named row.
    } else if (next) {
      const t = w.addText(next.title);
      t.font = SERIF(16); t.textColor = C.bandInk; t.lineLimit = 3;
      w.addSpacer(4);
      const at = w.addText(next.live ? 'now' : h12(next.start));
      at.font = SANS(11); at.textColor = C.bandMuted;
    } else {
      empty(w, 'A clear day.');
    }
    w.addSpacer();
    return w;
  }

  const rows = fam === 'large' ? 8 : 3;
  if (open.length) {
    open.slice(0, rows).forEach((it, i) => { if (i) w.addSpacer(5); todoRow(w, it); });
    if (open.length > rows) { w.addSpacer(5); const m = w.addText(`and ${open.length - rows} more`); m.font = SANS(11); m.textColor = C.bandMuted; }
  } else {
    empty(w, g.done ? `All ${g.done} ticked.` : 'Nothing on the list.');
  }

  const next = g.now || g.next;
  if (next) {
    w.addSpacer(9);
    const rule = w.addStack(); rule.size = new Size(0, 1); rule.backgroundColor = C.rule;
    w.addSpacer(8);
    eventLine(w, next, next.live ? 'now' : h12(next.start));
  }

  if (fam === 'large') {
    const later = (g.events || []).filter(e => !e.live && e !== next);
    later.slice(0, 4).forEach(e => { w.addSpacer(5); eventLine(w, e); });
    if (g.word) {
      w.addSpacer();
      const rule = w.addStack(); rule.size = new Size(0, 1); rule.backgroundColor = C.rule;
      w.addSpacer(8);
      const word = w.addText(g.word.w);
      word.font = SERIF(14); word.textColor = C.bandInk;
      const def = w.addText(g.word.def || '');
      def.font = SANS(11); def.textColor = C.bandMuted; def.lineLimit = 2;
    }
  }

  w.addSpacer();
  return w;
}

const g = await glance();
const widget = await build(g);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
