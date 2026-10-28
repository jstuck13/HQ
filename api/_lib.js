// Shared bits for the API routes: the Neon connection and the one-user passcode check.
import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const sql = neon(process.env.DATABASE_URL);

// ponytail: one table, one row per document; add real tables when a page needs queries.
let ready;
export const ensureTable = () => (ready ??= sql`
  CREATE TABLE IF NOT EXISTS documents (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);

// The session cookie is an HMAC of a fixed label under the passcode, so it can be
// verified without storing anything and is invalidated by changing PASSCODE.
const sign = () => createHmac('sha256', process.env.PASSCODE || '').update('hq-session').digest('hex');
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')));

export const isAuthed = req => {
  const got = cookie(req).hq || '', want = sign();
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
};
export const sessionCookie = () => `hq=${sign()}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 90}`;
export const clearCookie = () => 'hq=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0';
// Google checks the redirect against a fixed list, so it must always be the app's own address — never the
// one-off host of whichever deployment the browser happens to be on. Vercel hands us the production domain.
export const siteUrl = req => 'https://' + (process.env.HQ_HOST || process.env.VERCEL_PROJECT_PRODUCTION_URL || (req && req.headers.host) || '');
export const checkPasscode = p => {
  const want = process.env.PASSCODE || '';
  return !!want && p.length === want.length && timingSafeEqual(Buffer.from(p), Buffer.from(want));
};

// What day it is where you are, and how far into it. The server runs in UTC, so every route that reasons about
// "today" has to ask in HQ_TZ or it rolls over at the wrong hour. One definition, so the notifier and the
// glance endpoint can never disagree about which day they are describing.
export const HQ_TZ = process.env.HQ_TZ || 'America/Chicago';
export const localNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: HQ_TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, h: (+p.hour % 24) + (+p.minute) / 60 };
};
