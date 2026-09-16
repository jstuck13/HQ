// Step 2: Google sends the code back; trade it for a refresh token and keep that in the private `_google` document.
import { isAuthed, ensureTable } from '../_lib.js';
import { putDoc } from '../sync/_run.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.redirect(302, '/index.html');
  const code = req.query.code;
  if (!code) return res.redirect(302, '/calendar.html?google=denied');
  const redirect = `https://${req.headers.host}/api/auth/google-callback`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirect, grant_type: 'authorization_code' }),
  });
  const t = await r.json();
  if (!t.refresh_token) return res.redirect(302, '/calendar.html?google=failed');
  await ensureTable();
  await putDoc('_google', { refresh_token: t.refresh_token, connected: new Date().toISOString() });
  res.redirect(302, '/calendar.html?google=connected');
}
