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
// Sizes: small — the count and the next thing. medium — the count and three rows, each tappable. large — the day.
// Lock Screen (accessoryRect) — one line. Nothing here needs editing; the passcode is kept in the iOS keychain,
// never in this file, so the script is safe to paste anywhere.

const SITE = 'https://hq-six-puce.vercel.app';
const KEY = 'hq.passcode';

// HQ's own palette, from hq.css. The widget is a piece of the same object as the pages.
const C = {
  band: new Color('#1F3A2E'), bandInk: new Color('#F2ECDF'), bandMuted: new Color('#B9C9BE'),
  paper: new Color('#F5F0E6'), ink: new Color('#1E1B16'), ink3: new Color('#6A6256'),
  rule: new Color('#D3C9B6'), ox: new Color('#7A2E2B'), sage: new Color('#9DB4A4'),
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

    const r = new Request(SITE + '/api/glance');
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

function heading(w, g) {
  const row = w.addStack();
  row.centerAlignContent();
  const t = row.addText('HQ');
  t.font = SERIF(13); t.textColor = C.bandMuted;
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

function build(g) {
  const w = new ListWidget();
  w.backgroundColor = C.band;
  w.url = SITE + '/today.html';
  pad(w, 14);

  if (g.error) {
    const t = w.addText('HQ');
    t.font = SERIF(15); t.textColor = C.bandMuted;
    w.addSpacer(6);
    empty(w, g.error);
    return w;
  }

  const fam = config.widgetFamily || 'medium';
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
      w.url = `${SITE}/today.html?tick=${encodeURIComponent(it.text)}`;
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
const widget = build(g);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
