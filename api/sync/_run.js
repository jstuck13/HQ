// The sync runner. Every source is a function (docs) => summary; this wraps it with auth, the ledger, and document I/O.
// Imported records carry `source` and a stable `id` ('canvas:123'), so a re-sync updates in place and never touches what was typed.
import { sql, ensureTable, isAuthed } from '../_lib.js';

export const getDoc = async key => { const r = await sql`SELECT data FROM documents WHERE key = ${key}`; return r[0] ? r[0].data : null; };
export const putDoc = async (key, data) => sql`INSERT INTO documents (key, data, updated_at) VALUES (${key}, ${JSON.stringify(data)}::jsonb, now())
  ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;

// A cron call carries the CRON_SECRET; a person clicking "Sync now" carries the session cookie.
const allowed = req => (process.env.CRON_SECRET && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`) || isAuthed(req);

export function syncRoute(name, run) {
  return async function handler(req, res) {
    if (!allowed(req)) return res.status(401).json({ error: 'sign in' });
    await ensureTable();
    const ledger = (await getDoc('sync')) || {};
    const started = new Date().toISOString();
    try {
      const summary = await run({ getDoc, putDoc });
      ledger[name] = { last: started, ok: true, ...summary };
      await putDoc('sync', ledger);
      return res.status(200).json(ledger[name]);
    } catch (e) {
      ledger[name] = { ...(ledger[name] || {}), last: started, ok: false, error: String(e.message || e).slice(0, 300) };
      await putDoc('sync', ledger);
      return res.status(500).json(ledger[name]);
    }
  };
}

// Canvas-style pagination: follow rel="next" links until there are none.
export async function fetchAll(url, headers) {
  const out = [];
  while (url) {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).pathname}`);
    out.push(...(await r.json()));
    const link = r.headers.get('link') || '';
    const m = /<([^>]+)>;\s*rel="next"/.exec(link);
    url = m ? m[1] : null;
  }
  return out;
}
