// Google Calendar → Calendar. Every event on your selected calendars, two weeks back to ninety days ahead,
// becomes a one-off entry tagged source:'google' (recurring events arrive already expanded into instances).
import { syncRoute } from './_run.js';

const iso = d => d.toISOString().slice(0, 10);
const hours = d => d.getHours() + d.getMinutes() / 60;
// Google gives RFC3339 with an offset; read it in the calendar's own zone, not the server's
const local = (s, tz) => { const d = new Date(s); const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, h: (+p.hour % 24) + (+p.minute) / 60 }; };

export default syncRoute('google', async ({ getDoc, putDoc }) => {
  const g = await getDoc('_google');
  if (!g || !g.refresh_token) throw new Error('Google is not connected yet');
  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: g.refresh_token, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }),
  });
  const tok = await tr.json();
  if (!tok.access_token) throw new Error('Google refused the refresh token; reconnect');
  const headers = { Authorization: `Bearer ${tok.access_token}` };

  // Ask Google, and say what Google answered. This used to read `.items || []`, so a refusal — a scope not
  // granted, a revoked token — arrived as "no calendars", which reads like an empty account and is impossible
  // to act on. Listing calendars needs calendar.readonly; the events scope alone cannot do it.
  const lr = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers });
  const lj = await lr.json().catch(() => ({}));
  if (!lr.ok) {
    const why = (lj.error && (lj.error.message || lj.error.status)) || `HTTP ${lr.status}`;
    const granted = String(g.scope || tok.scope || '');
    const canList = /auth\/calendar(\.readonly|\.calendarlist[^\s]*)?(\s|$)/.test(granted);
    throw new Error(canList ? `Google refused the calendar list: ${why}`
      : `Google will not list your calendars: ${why}. The connection does not include permission to see which calendars you have — reconnect Google on the Calendar page to grant it.`);
  }
  const cals = lj.items || [];
  const chosen = cals.filter(c => c.selected !== false && c.accessRole !== 'freeBusyReader');
  const from = new Date(); from.setDate(from.getDate() - 14);
  const to = new Date(); to.setDate(to.getDate() + 90);

  const cal = (await getDoc('calendar')) || { cats: [{ id: 'cal', name: 'Appointments', tint: '#E9EEF3' }], series: [], notes: {}, hidden: [] };
  cal.series ??= []; cal.ignored ??= []; cal.cats ??= [];
  if (!cal.cats.some(c => c.id === 'cal')) cal.cats.unshift({ id: 'cal', name: 'Appointments', tint: '#E9EEF3' });
  const seen = new Set(); let added = 0, updated = 0;
  const ours = new Set(cal.series.filter(s => s.gid).map(s => s.gid));   // events HQ put there: they are already here
  // a category you gave one instance of a repeating event applies to its siblings, new ones included
  const groupCat = {}; for (const s of cal.series) if (s.group && s.cat && s.cat !== 'cal') groupCat[s.group] = s.cat;

  let failed = 0;
  for (const c of chosen) {
    const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events`);
    u.search = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '500' }).toString();
    const r = await fetch(u, { headers }); if (!r.ok) { failed++; continue; }
    for (const e of (await r.json()).items || []) {
      if (e.status === 'cancelled' || !e.start) continue;
      if (ours.has(e.id)) continue;                                      // HQ's own entry, coming home
      const id = `google:${e.id}`; seen.add(id);
      if (cal.ignored.includes(id)) continue;
      let date, start, end, sub = c.primary ? '' : c.summary || '';
      if (e.start.dateTime) { const a = local(e.start.dateTime, c.timeZone || e.start.timeZone), b = local(e.end.dateTime, c.timeZone || e.end.timeZone); date = a.date; start = a.h; end = b.date === a.date ? Math.max(b.h, a.h + 0.25) : 24; }
      else { date = e.start.date; start = 8; end = 8.5; sub = ['All day', sub].filter(Boolean).join(' · '); }
      const group = e.recurringEventId ? `google:${e.recurringEventId}` : undefined;
      const record = { id, group, date, start: Math.round(start * 4) / 4, end: Math.min(24, Math.round(end * 4) / 4), title: e.summary || '(no title)', sub: [sub, e.location].filter(Boolean).join(' · '), rep: [], source: 'google', url: e.htmlLink };
      const existing = cal.series.find(s => s.id === id);
      if (existing) { Object.assign(existing, record, { cat: existing.cat || 'cal' }); updated++; }
      else { cal.series.push({ ...record, cat: (group && groupCat[group]) || 'cal' }); added++; }
    }
  }
  // Events that vanished from Google inside the window vanish here too (notes on them are kept) — but only when
  // we actually managed to read every calendar. Absence of evidence is not evidence of deletion: a calendar that
  // did not answer looks exactly like a calendar with nothing in it, and pruning on that reading empties the
  // page. Reconnecting the account is precisely when a scope is most likely to be refused on the first run, so
  // that is when the old code was most likely to delete the lot.
  const complete = chosen.length > 0 && failed === 0;
  let removed = 0;
  if (complete) {
    const before = cal.series.length;
    cal.series = cal.series.filter(s => s.source !== 'google' || seen.has(s.id) || s.date < iso(from) || s.date > iso(to));
    removed = before - cal.series.length;
  }

  // Write back onto whatever the document is NOW, not onto the copy this run started with. A run takes seconds;
  // an entry added on the page in that time used to be carried away with the stale copy, and the page — seeing
  // its save refused as out of date — would reload and lose it. Only Google's own entries are replaced here.
  if (added || updated || removed) {
    const fresh = (await getDoc('calendar')) || cal;
    fresh.series = [...(fresh.series || []).filter(s => s.source !== 'google'), ...cal.series.filter(s => s.source === 'google')];
    fresh.cats ??= cal.cats; fresh.notes ??= cal.notes; fresh.hidden ??= cal.hidden; fresh.ignored ??= cal.ignored;
    if (!fresh.cats.some(c => c.id === 'cal')) fresh.cats.unshift({ id: 'cal', name: 'Appointments', tint: '#E9EEF3' });
    await putDoc('calendar', fresh);
  }
  // What was read is kept either way; what could not be read is said out loud rather than quietly acted on,
  // so a half-answered run shows red in the bell instead of looking like a clean sync that found nothing.
  if (!complete) throw new Error(chosen.length === 0
    ? `Google listed ${cals.length} ${cals.length === 1 ? 'calendar' : 'calendars'} and none could be read from — nothing was removed. Tick the calendars you want in Google Calendar.`
    : `${failed} of ${chosen.length} calendars did not answer — nothing was removed. Sync again.`);
  return { calendars: chosen.length, added, updated, removed };
});
