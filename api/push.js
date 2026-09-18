// Push subscriptions. GET → the public VAPID key (so a device can subscribe). POST a subscription → kept in the
// private `_push` document. DELETE → removed. Devices subscribe themselves from the bell; nothing is stored unasked.
import { isAuthed, ensureTable } from './_lib.js';
import { getDoc, putDoc } from './sync/_run.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'sign in' });
  const key = process.env.VAPID_PUBLIC_KEY || '';
  if (req.method === 'GET') { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json({ key, ready: !!(key && process.env.VAPID_PRIVATE_KEY) }); }
  await ensureTable();
  const doc = (await getDoc('_push')) || { subs: [], sent: {} };
  const sub = req.body && req.body.subscription; const endpoint = sub && sub.endpoint || (req.body && req.body.endpoint);
  if (!endpoint) return res.status(400).json({ error: 'no subscription' });
  doc.subs = (doc.subs || []).filter(s => s.endpoint !== endpoint);
  if (req.method === 'POST') doc.subs.push({ ...sub, label: String(req.body.label || '').slice(0, 60), added: new Date().toISOString() });
  else if (req.method !== 'DELETE') { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).end(); }
  await putDoc('_push', doc);
  return res.status(200).json({ ok: true, devices: doc.subs.length });
}
