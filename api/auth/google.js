// Step 1 of connecting Google: send the signed-in user to Google's consent screen (read-only calendar).
import { isAuthed, siteUrl } from '../_lib.js';

export default function handler(req, res) {
  if (!isAuthed(req)) return res.redirect(302, '/index.html');
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) return res.status(500).send('GOOGLE_CLIENT_ID is not set');
  const redirect = `${siteUrl(req)}/api/auth/google-callback`;
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({
    client_id: id, redirect_uri: redirect, response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
  }).toString();
  res.redirect(302, u.toString());
}
