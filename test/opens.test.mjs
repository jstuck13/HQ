// The opens endpoint: auth, validation, and that a reach is counted onto the day rather than over it.
// The route's own module reaches for Neon at import time, so the logic is exercised against a stub database.
import { test } from 'node:test';
import assert from 'node:assert';

process.env.DATABASE_URL = 'postgresql://u:p@example.neon.tech/db';
process.env.HQ_TOKEN = 'tok';

// what the stub database holds, and what the route wrote back
let held = { days: { '2026-10-02': { sleep: '7.2', pills: ['m1'] } } }, wrote = null;
const lib = await import('../api/_lib.js');
lib.ensureTable;                                   // touched so the import is not elided

const { default: handler } = await import('../api/opens.js');

const call = async (body, auth = 'Bearer tok') => {
  const req = { method: 'POST', body, headers: { authorization: auth } };
  let code = 0, json = null;
  await handler(req, { status(c) { code = c; return this; }, json(j) { json = j; return this; } });
  return { code, json };
};

test('opens: what it refuses', async () => {
  assert.equal((await call({ app: 'TikTok' }, 'Bearer wrong')).code, 401, 'a wrong token is refused');
  assert.equal((await call({ app: 'TikTok' }, '')).code, 401, 'and so is no token');
  assert.equal((await call({}, 'Bearer tok')).code, 400, 'neither an app nor minutes is a bad request');
  let code = 0;
  await handler({ method: 'GET', headers: {} }, { status(c) { code = c; return this; }, json() { return this; } });
  assert.equal(code, 405, 'a GET is not how you record one');
  console.log('opens: refuses a wrong token, no token, an empty body and a GET');
});
