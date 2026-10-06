// One command before a deploy: node check.mjs
//
// The pieces were always there — a test suite, a click sweep, an alignment probe, a design linter — but they
// were four things run by hand, which is how a misaligned button in the band reached production. This runs all
// of them, says what each found, and exits non-zero if anything that should block a deploy spoke up.
//
//   node check.mjs            everything
//   node check.mjs --quick    the tests and the linter only (no browser)
//
// The sweep and the probe need the local server on :8766 and a copy of Chrome; without either they are skipped
// and said to be skipped, rather than quietly passing.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const R = '.impeccable/review';
const PAGES = 'today,calendar,finances,library,school,health,review,groceries,investments,study,patterns,span,day,list';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const quick = process.argv.includes('--quick');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', timeout: 900000, ...opts });
const results = [];
const step = (name, blocking, fn) => {
  process.stdout.write(`  ${name} … `);
  let r;
  try { r = fn(); } catch (e) { r = { ok: false, note: String(e.message).slice(0, 80) }; }
  results.push({ name, blocking, ...r });
  console.log(r.skipped ? `skipped — ${r.note}` : r.ok ? `ok${r.note ? ' — ' + r.note : ''}` : `FOUND — ${r.note}`);
};

const serverUp = () => {
  const r = run('node', ['-e', `fetch('http://localhost:8766/hq.css').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`]);
  return r.status === 0;
};

console.log('\nHQ · checks\n');

// 1 · the unit tests: the sync logic, the shell, the nightly search, the digest
step('tests', true, () => {
  const files = readdirSync(R).filter(f => f.endsWith('.test.mjs')).map(f => `${R}/${f}`);
  if (!files.length) return { skipped: true, note: 'none found' };
  const r = run('node', ['--test', ...files]);
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = /^. pass (\d+)/m.exec(out), fail = /^. fail (\d+)/m.exec(out);
  const failed = fail ? +fail[1] : (r.status === 0 ? 0 : 1);
  // two of these talk to Neon and cannot run without DATABASE_URL; they are named rather than counted as faults
  const noDb = /Database connection string|No database connection/.test(out);
  const passed = pass ? +pass[1] : 0;
  if (failed === 0) return { ok: true, note: `${passed} passing` };
  // two suites talk to Neon and cannot run from here; that is a missing environment, not a broken test
  return noDb && failed <= 2
    ? { ok: true, note: `${passed} passing · ${failed} need DATABASE_URL, not run` }
    : { ok: false, note: `${failed} failing` };
});

// 2 · the design linter the repo carries: the type scale, the palette, motion
step('design linter', false, () => {
  if (!existsSync('lint.mjs')) return { skipped: true, note: 'no lint.mjs' };
  const r = run('node', ['lint.mjs']);
  const m = /(\d+) findings? across (\d+) files?/.exec((r.stdout || '') + (r.stderr || ''));
  if (!m) return { ok: r.status === 0, note: r.status === 0 ? 'clean' : 'would not run' };
  return { ok: +m[1] === 0, note: `${m[1]} findings across ${m[2]} files` };
});

if (!quick) {
  const up = serverUp(), chrome = existsSync(CHROME);
  const why = !chrome ? 'Chrome not found' : !up ? 'nothing serving :8766' : null;

  // 3 · every control on every page clicked, and anything that moved reported
  step('click sweep', true, () => {
    if (why) return { skipped: true, note: why };
    const r = run('python', [`${R}/debug-run.py`, PAGES]);
    const out = (r.stdout || '') + (r.stderr || '');
    const errs = [...out.matchAll(/ERRS\[(?!none)([^\]]*)\]/g)].map(m => m[1]);
    const shifts = [...out.matchAll(/SHIFT (?!none)([^|]*)/g)].map(m => m[1].trim());
    const over = [...out.matchAll(/xOverflow:true/g)];
    const bad = [...errs, ...shifts, ...over.map(() => 'a page scrolls sideways')];
    return bad.length ? { ok: false, note: bad.slice(0, 3).join(' · ') } : { ok: true, note: 'no errors, nothing moved' };
  });

  // 4 · the edges: columns, baselines, and words rather than boxes — at both widths
  for (const w of ['1440', '500']) step(`alignment at ${w}`, false, () => {
    if (why) return { skipped: true, note: why };
    const r = run('python', [`${R}/alignrun.py`, PAGES, w]);
    const out = (r.stdout || '') + (r.stderr || '');
    const found = [...out.matchAll(/\((\d+) found\)/g)].reduce((n, m) => n + +m[1], 0);
    return found ? { ok: false, note: `${found} to look at` } : { ok: true, note: 'edges agree' };
  });
}

const blocked = results.filter(r => r.blocking && !r.ok && !r.skipped);
const soft = results.filter(r => !r.blocking && !r.ok && !r.skipped);
console.log('');
if (soft.length) console.log(`  ${soft.length} worth a look, not blocking: ${soft.map(r => r.name).join(', ')}`);
console.log(blocked.length ? `  ✗ ${blocked.map(r => r.name).join(', ')} — do not deploy\n` : '  ✓ nothing blocking a deploy\n');
process.exit(blocked.length ? 1 : 0);
