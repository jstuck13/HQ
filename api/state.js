// One JSON document per key. GET /api/state?key=library → the document (or null).
// PUT /api/state?key=library with a JSON body → stored. Both need the session cookie.
import { sql, ensureTable, isAuthed } from './_lib.js';

const KEY = /^[a-z0-9._-]{1,80}$/i;

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  const key = String(req.query.key || '');
  if (!KEY.test(key)) return res.status(400).json({ error: 'bad key' });
  await ensureTable();

  if (req.method === 'GET') {
    const rows = await sql`SELECT data, updated_at FROM documents WHERE key = ${key}`;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows[0] ? { data: rows[0].data, updated_at: rows[0].updated_at } : null);
  }
  if (req.method === 'PUT') {
    const data = req.body;
    if (data === undefined || data === null) return res.status(400).json({ error: 'no body' });
    await sql`INSERT INTO documents (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).end();
}
