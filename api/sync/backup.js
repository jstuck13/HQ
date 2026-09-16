// Nightly backup. Every document, as it stood, into the `backups` table under today's date; thirty days kept.
// POST /api/sync/backup runs it (cron, or "Sync now" in the bell). GET /api/sync/backup?day=YYYY-MM-DD downloads one.
import { sql, isAuthed } from '../_lib.js';
import { syncRoute } from './_run.js';

let ready;
const table = () => (ready ??= sql`CREATE TABLE IF NOT EXISTS backups (day text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
const run = syncRoute('backup', async () => {
  await table();
  const rows = await sql`SELECT key, data FROM documents WHERE key NOT LIKE '\\_%'`;   // tokens stay out of backups
  const day = new Date().toISOString().slice(0, 10);
  const data = Object.fromEntries(rows.map(r => [r.key, r.data]));
  await sql`INSERT INTO backups (day, data) VALUES (${day}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (day) DO UPDATE SET data = EXCLUDED.data, created_at = now()`;
  await sql`DELETE FROM backups WHERE day < ${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}`;
  return { documents: rows.length, day };
});

export default async function handler(req, res) {
  const cron = process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;   // Vercel's cron arrives as a GET
  if (req.method === 'POST' || cron) return run(req, res);
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  await table();
  const day = String(req.query.day || '');
  if (!day) { const days = await sql`SELECT day FROM backups ORDER BY day DESC`; return res.status(200).json(days.map(d => d.day)); }
  const r = await sql`SELECT data FROM backups WHERE day = ${day}`;
  if (!r[0]) return res.status(404).json({ error: 'no backup for that day' });
  res.setHeader('Content-Disposition', `attachment; filename="hq-${day}.json"`);
  return res.status(200).json(r[0].data);
}
