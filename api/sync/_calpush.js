// Calendar → Google. The other direction: entries you made in HQ are written to your Google calendar,
// changed there when you change them here, and removed there when you remove them here.
//
// Only entries HQ created are ever touched. Anything that arrived from Google (source: 'google') is left
// alone — it is already there — so the blast radius is the events this app made and nothing else.
//
// Each pushed entry keeps the id Google gave it in `gid`, and a `pushed` fingerprint of what was last sent.
// _google.js skips any incoming event whose id is already claimed by a gid, which is what stops the two
// directions from making twins of each other.
import { syncRoute } from './_run.js';

const TZ = process.env.HQ_TZ || 'America/Chicago';
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];   // HQ counts weekdays from Monday
const pad = n => String(n).padStart(2, '0');
// an hour as a fraction of the day, on a date, written the way Google wants it
const stamp = (date, hours) => { const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return `${date}T${pad(Math.min(23, h))}:${pad(h > 23 ? 59 : m)}:00`; };
const wd = date => (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;

// what HQ would send for an entry; also the fingerprint that says whether it needs sending again
export const bodyFor = (s, cat) => {
  const b = {
    summary: s.title || '(no title)',
    description: [s.sub, cat ? `HQ · ${cat}` : 'HQ'].filter(Boolean).join('\n'),
    start: { dateTime: stamp(s.date, +s.start || 0), timeZone: TZ },
    end: { dateTime: stamp(s.date, Math.max(+s.start || 0, +s.end || 0)), timeZone: TZ },
  };
  const rep = (s.rep || []).filter(n => n >= 0 && n <= 6);
  if (rep.length) b.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${[...new Set([wd(s.date), ...rep])].sort().map(n => BYDAY[n]).join(',')}`];
  return b;
};
export const fingerprint = (s, cat) => JSON.stringify(bodyFor(s, cat));

async function token(getDoc) {
  const g = await getDoc('_google');
  if (!g || !g.refresh_token) throw new Error('Google is not connected yet');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: g.refresh_token, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }),
  });
  const t = await r.json();
  if (!t.access_token) throw new Error('Google refused the refresh token; reconnect');
  return t.access_token;
}

// The work itself, given a calendar document and something that can talk to Google. Kept apart from the
// route so it can be exercised without a database or a network.
export async function pushCalendar(cal, api) {
  cal.series ??= []; cal.dropped ??= [];
  const catName = s => (cal.cats || []).find(c => c.id === s.cat)?.name;
  const mine = cal.series.filter(s => s.source !== 'google');
  let added = 0, changed = 0, removed = 0; const trouble = [];

  for (const s of mine.filter(x => !x.gid)) {
    const r = await api.add(bodyFor(s, catName(s)));
    if (r.id) { s.gid = r.id; s.pushed = fingerprint(s, catName(s)); added++; }
    else trouble.push(`add ${s.title}: ${r.error}`);
  }

  for (const s of mine.filter(x => x.gid)) {
    const now = fingerprint(s, catName(s));
    if (s.pushed === now) continue;
    const r = await api.change(s.gid, bodyFor(s, catName(s)));
    if (r.gone) { delete s.gid; delete s.pushed; trouble.push(`${s.title}: gone from Google, it will be added again`); continue; }
    if (r.ok) { s.pushed = now; changed++; } else trouble.push(`change ${s.title}: ${r.error}`);
  }

  // an entry removed here is removed there; the note of it is kept until Google confirms
  const left = [];
  for (const gid of cal.dropped) {
    const r = await api.remove(gid);
    if (r.ok || r.gone) { removed++; continue; }
    trouble.push(`remove: ${r.error}`); left.push(gid);
  }
  cal.dropped = left;

  return { added, changed, removed, ...(trouble.length ? { errors: trouble.slice(0, 4).join('; ') } : {}) };
}

// nothing to say to Google unless something is new, changed, or gone
export const needsPush = cal => {
  const catName = s => (cal.cats || []).find(c => c.id === s.cat)?.name;
  const mine = (cal.series || []).filter(s => s.source !== 'google');
  return mine.some(s => !s.gid || s.pushed !== fingerprint(s, catName(s))) || !!(cal.dropped || []).length;
};

export default syncRoute('calpush', async ({ getDoc, putDoc }) => {
  const cal = (await getDoc('calendar')) || {};
  if (!needsPush(cal)) return { added: 0, changed: 0, removed: 0, quiet: true };

  const access = await token(getDoc);
  const headers = { Authorization: `Bearer ${access}`, 'content-type': 'application/json' };
  const url = (id = '') => `https://www.googleapis.com/calendar/v3/calendars/primary/events${id ? '/' + encodeURIComponent(id) : ''}`;
  const api = {
    add: async body => { try { const r = await fetch(url(), { method: 'POST', headers, body: JSON.stringify(body) });
      if (!r.ok) return { error: 'Google said ' + r.status }; return { id: (await r.json()).id }; } catch (e) { return { error: e.message }; } },
    change: async (gid, body) => { try { const r = await fetch(url(gid), { method: 'PATCH', headers, body: JSON.stringify(body) });
      if (r.status === 404 || r.status === 410) return { gone: true };
      return r.ok ? { ok: true } : { error: 'Google said ' + r.status }; } catch (e) { return { error: e.message }; } },
    remove: async gid => { try { const r = await fetch(url(gid), { method: 'DELETE', headers });
      if (r.status === 404 || r.status === 410) return { gone: true };
      return r.ok ? { ok: true } : { error: 'Google said ' + r.status }; } catch (e) { return { error: e.message }; } },
  };

  const out = await pushCalendar(cal, api);
  await putDoc('calendar', cal);
  return out;
});
