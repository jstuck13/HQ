// One JSON document per key. GET /api/state?key=library → the document (or null); GET /api/state?keys=a,b,c → { a: doc|null, ... } in one round trip.
// PUT /api/state?key=library with a JSON body → stored. Both need the session cookie.
import { sql, ensureTable, isAuthed } from './_lib.js';

const KEY = /^[a-z0-9._-]{1,80}$/i;

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  if (req.method === 'GET' && req.query.keys !== undefined) {
    const keys = String(req.query.keys).split(',').filter(Boolean);
    if (!keys.length || keys.length > 40 || keys.some(k => !KEY.test(k) || k.startsWith('_'))) return res.status(400).json({ error: 'bad key' });
    await ensureTable();
    const rows = await sql`SELECT key, data, updated_at FROM documents WHERE key = ANY(${keys})`;
    const out = Object.fromEntries(keys.map(k => [k, null])); rows.forEach(r => { out[r.key] = { data: r.data, updated_at: r.updated_at }; });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(out);
  }
  const key = String(req.query.key || '');
  if (!KEY.test(key) || key.startsWith('_')) return res.status(400).json({ error: 'bad key' });   // _keys hold tokens; never served
  await ensureTable();

  if (req.method === 'GET') {
    const rows = await sql`SELECT data, updated_at FROM documents WHERE key = ${key}`;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows[0] ? { data: rows[0].data, updated_at: rows[0].updated_at } : null);
  }
  if (req.method === 'PUT') {
    const data = req.body;
    if (data === undefined || data === null) return res.status(400).json({ error: 'no body' });
    // the client says which copy it was editing (x-hq-base = updated_at it loaded); a newer copy on the server means another device wrote — refuse, hand it back
    const base = req.headers['x-hq-base'];
    if (base) {
      const cur = await sql`SELECT data, updated_at FROM documents WHERE key = ${key}`;
      if (cur[0] && new Date(cur[0].updated_at).getTime() !== new Date(base).getTime()) return res.status(409).json({ conflict: true, data: cur[0].data, updated_at: cur[0].updated_at });
    }
    const rows = await sql`INSERT INTO documents (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING updated_at`;
    return res.status(200).json({ ok: true, updated_at: rows[0].updated_at });
  }
  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).end();
}
