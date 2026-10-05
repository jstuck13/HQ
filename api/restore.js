// Putting a document back the way it was. The nightly backup keeps thirty days of every document; until now
// nothing could read one back in, which makes it a copy rather than a safety net.
//
//   GET  /api/restore                        → the days held, and what each one has in it
//   GET  /api/restore?day=YYYY-MM-DD         → that day's documents, with a count of what differs from now
//   POST /api/restore { day, keys: [...] }   → put those documents back as they stood on that day
//
// Restoring is deliberately narrow: you name the day and you name the documents. Nothing is ever restored
// wholesale, because the usual case is one page that went wrong while the rest of the week carried on.
// What is about to be overwritten is itself backed up first, under a `before-restore` day, so a restore
// is as reversible as the thing it undoes.
import { sql, isAuthed } from './_lib.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[a-z0-9._-]{1,80}$/i;
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  await sql`CREATE TABLE IF NOT EXISTS backups (day text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;

  const now = async () => Object.fromEntries((await sql`SELECT key, data FROM documents WHERE key NOT LIKE '\\_%'`).map(r => [r.key, r.data]));
  const dayOf = async day => { const r = await sql`SELECT data FROM backups WHERE day = ${day}`; return r[0] ? r[0].data : null; };

  if (req.method === 'GET') {
    const day = String(req.query.day || '');
    if (!day) {
      const rows = await sql`SELECT day, created_at, jsonb_object_keys(data) AS key FROM backups ORDER BY day DESC`;
      const byDay = {};
      for (const r of rows) (byDay[r.day] ??= { day: r.day, at: r.created_at, keys: [] }).keys.push(r.key);
      return res.status(200).json(Object.values(byDay));
    }
    if (!DAY.test(day)) return res.status(400).json({ error: 'bad day' });
    const was = await dayOf(day);
    if (!was) return res.status(404).json({ error: 'no backup for that day' });
    const live = await now();
    // what each document would change, so nothing is restored blind
    const keys = [...new Set([...Object.keys(was), ...Object.keys(live)])].sort().map(k => ({
      key: k,
      inBackup: was[k] !== undefined,
      changed: was[k] !== undefined && !same(was[k], live[k]),
      missingNow: was[k] !== undefined && live[k] === undefined,
    }));
    return res.status(200).json({ day, keys });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' });

  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const day = String((body || {}).day || ''), keys = ((body || {}).keys || []).filter(k => KEY.test(k) && !k.startsWith('_'));
  if (!DAY.test(day)) return res.status(400).json({ error: 'bad day' });
  if (!keys.length) return res.status(400).json({ error: 'name at least one document' });

  const was = await dayOf(day);
  if (!was) return res.status(404).json({ error: 'no backup for that day' });
  const missing = keys.filter(k => was[k] === undefined);
  if (missing.length) return res.status(400).json({ error: `not in that backup: ${missing.join(', ')}` });

  // the state about to be replaced, kept so this is itself undoable
  const live = await now();
  const safety = Object.fromEntries(keys.filter(k => live[k] !== undefined).map(k => [k, live[k]]));
  if (Object.keys(safety).length) {
    await sql`INSERT INTO backups (day, data) VALUES ('before-restore', ${JSON.stringify(safety)}::jsonb)
      ON CONFLICT (day) DO UPDATE SET data = EXCLUDED.data, created_at = now()`;
  }

  for (const k of keys) {
    await sql`INSERT INTO documents (key, data, updated_at) VALUES (${k}, ${JSON.stringify(was[k])}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
  }
  return res.status(200).json({ day, restored: keys, kept: Object.keys(safety).length ? 'before-restore' : null });
}
