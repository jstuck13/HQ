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

  const cals = (await (await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers })).json()).items || [];
  const chosen = cals.filter(c => c.selected !== false && c.accessRole !== 'freeBusyReader');
  const from = new Date(); from.setDate(from.getDate() - 14);
  const to = new Date(); to.setDate(to.getDate() + 90);

  const cal = (await getDoc('calendar')) || { cats: [{ id: 'cal', name: 'Appointments', tint: '#E9EEF3' }], series: [], notes: {}, hidden: [] };
  cal.series ??= []; cal.ignored ??= []; cal.cats ??= [];
  if (!cal.cats.some(c => c.id === 'cal')) cal.cats.unshift({ id: 'cal', name: 'Appointments', tint: '#E9EEF3' });
  const seen = new Set(); let added = 0, updated = 0;

  for (const c of chosen) {
    const u = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events`);
    u.search = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '500' }).toString();
    const r = await fetch(u, { headers }); if (!r.ok) continue;
    for (const e of (await r.json()).items || []) {
      if (e.status === 'cancelled' || !e.start) continue;
      const id = `google:${e.id}`; seen.add(id);
      if (cal.ignored.includes(id)) continue;
      let date, start, end, sub = c.primary ? '' : c.summary || '';
      if (e.start.dateTime) { const a = local(e.start.dateTime, c.timeZone || e.start.timeZone), b = local(e.end.dateTime, c.timeZone || e.end.timeZone); date = a.date; start = a.h; end = b.date === a.date ? Math.max(b.h, a.h + 0.25) : 20; }
      else { date = e.start.date; start = 8; end = 8.5; sub = ['All day', sub].filter(Boolean).join(' · '); }
      if (start < 8) { start = 8; if (end <= 8) end = 8.5; }
      if (start >= 20) continue;                       // outside the drawn day; skipped rather than mis-placed
      const record = { id, date, start: Math.round(start * 4) / 4, end: Math.min(20, Math.round(end * 4) / 4), title: e.summary || '(no title)', cat: 'cal', sub: [sub, e.location].filter(Boolean).join(' · '), rep: [], source: 'google', url: e.htmlLink };
      const existing = cal.series.find(s => s.id === id);
      if (existing) { Object.assign(existing, record); updated++; } else { cal.series.push(record); added++; }
    }
  }
  // events that vanished from Google inside the window vanish here too (notes on them are kept)
  const before = cal.series.length;
  cal.series = cal.series.filter(s => s.source !== 'google' || seen.has(s.id) || s.date < iso(from) || s.date > iso(to));
  await putDoc('calendar', cal);
  return { calendars: chosen.length, added, updated, removed: before - cal.series.length };
});
