// A reach for the phone, recorded. An iOS Personal Automation fires on "When <app> Is Opened" and posts here;
// nothing else can see Screen Time, so the count of opens is what there is — and for short-form scrolling it is
// arguably the better number anyway, since forty reaches say more than ninety minutes does.
//
//   POST /api/opens  { "app": "TikTok" }      one more open, today
//   POST /api/opens  { "minutes": 143 }       yesterday's Screen Time total, typed or shortcut-read
//
// Authorised by a bearer token so a phone never carries the passcode: HQ_TOKEN if set, else CRON_SECRET.
// Opens land in the health document beside the day's other readings, which is where Health, the week and
// Patterns already look — and they are merged onto what is there rather than written over it.
import { sql, ensureTable, isAuthed } from './_lib.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const token = () => (process.env.HQ_TOKEN || process.env.CRON_SECRET || '').trim();

const allowed = req => {
  const want = token();
  if (want && req.headers.authorization === `Bearer ${want}`) return true;
  return isAuthed(req);                                    // or the browser's own session, for the Health page
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'post only' });
  if (!allowed(req)) return res.status(401).json({ error: 'sign in' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body ||= {};

  // the phone's own date, since a reach at 11pm belongs to that evening wherever the server thinks it is
  const day = DAY.test(body.day || '') ? body.day : new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const app = String(body.app || '').trim().slice(0, 40);
  const minutes = body.minutes == null ? null : Math.max(0, Math.min(1440, Math.round(+body.minutes)));
  if (!app && minutes == null) return res.status(400).json({ error: 'send an app, or minutes' });

  await ensureTable();
  const rows = await sql`SELECT data FROM documents WHERE key = 'health'`;
  const health = rows[0] ? rows[0].data : {};
  health.days ??= {};
  const rec = (health.days[day] ??= {});

  if (app) { rec.opens = (+rec.opens || 0) + 1; rec.apps ??= {}; rec.apps[app] = (+rec.apps[app] || 0) + 1; }
  if (minutes != null) rec.screen = minutes;

  await sql`INSERT INTO documents (key, data, updated_at) VALUES ('health', ${JSON.stringify(health)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;

  return res.status(200).json({ day, opens: rec.opens || 0, screen: rec.screen ?? null, app: app || undefined });
}
