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
export const checkPasscode = p => {
  const want = process.env.PASSCODE || '';
  return !!want && p.length === want.length && timingSafeEqual(Buffer.from(p), Buffer.from(want));
};
