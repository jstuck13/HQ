// POST {passcode} → session cookie. DELETE → sign out. GET → { authed }.
import { isAuthed, checkPasscode, sessionCookie, clearCookie } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ authed: isAuthed(req) });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', clearCookie()); return res.status(200).json({ ok: true }); }
  if (req.method === 'POST') {
    const passcode = String((req.body && req.body.passcode) || '');
    if (!checkPasscode(passcode)) return res.status(401).json({ error: 'wrong passcode' });
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end();
}
