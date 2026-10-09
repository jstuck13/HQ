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
    // Two scopes, because they do different jobs and the second does not imply the first. calendar.events reads
    // and writes events, which is what the sync is for; but listing which calendars you have is calendarList,
    // and that is only granted by calendar.readonly. Asking for events alone left the sync able to read every
    // event and unable to discover a single calendar to read them from — so it found none, and a reconnect that
    // reset an older, broader grant turned a working calendar into an empty one.
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
  }).toString();
  res.redirect(302, u.toString());
}
