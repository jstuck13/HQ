// Step 2: Google sends the code back; trade it for a refresh token and keep that in the private `_google` document.
import { isAuthed, ensureTable, siteUrl } from '../_lib.js';
import { getDoc, putDoc } from '../sync/_run.js';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.redirect(302, '/index.html');
  const code = req.query.code;
  if (!code) return res.redirect(302, '/calendar.html?google=denied');
  const redirect = `${siteUrl(req)}/api/auth/google-callback`;   // the very same string, or Google refuses the exchange
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: redirect, grant_type: 'authorization_code' }),
  });
  const t = await r.json();
  if (!t.refresh_token) return res.redirect(302, '/calendar.html?google=failed');
  await ensureTable();
  const writes = String(t.scope || '').includes('auth/calendar.events') || /auth\/calendar(\s|$)/.test(String(t.scope || ''));
  await putDoc('_google', { refresh_token: t.refresh_token, connected: new Date().toISOString(), scope: t.scope || '' });
  const ledger = (await getDoc('sync')) || {};   // the page may not read the private document, so the fact lives here
  ledger.google = { ...(ledger.google || {}), connected: new Date().toISOString(), writes };
  await putDoc('sync', ledger);
  res.redirect(302, '/calendar.html?google=connected');
}
