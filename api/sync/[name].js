// One route for every sync, so Vercel counts one function: /api/sync/canvas, /api/sync/garmin, … each maps to its
// module here (_canvas.js, _garmin.js, …). The modules are unchanged; this file only dispatches.
export const maxDuration = 60;   // the nightly job reads a few hundred ad pages in parallel

const SOURCES = ['canvas', 'google', 'garmin', 'daily', 'backup', 'bills', 'notify'];

export default async function handler(req, res) {
  const name = String(req.query.name || '');
  if (!SOURCES.includes(name)) return res.status(404).json({ error: 'no such sync' });
  const mod = await import(`./_${name}.js`);
  return mod.default(req, res);
}
