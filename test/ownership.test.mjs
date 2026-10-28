// Who owns the band. The date line, the directory, the bell and the search button are painted by the shared
// scripts on every page, and nothing else may paint them. Three pages had quietly grown their own copy of the
// date line — using a format without the weekday — and which copy won depended entirely on script order. It
// was wrong for months and only showed when the order changed, because both copies ran and the later one
// silently overwrote the earlier. Nothing could have caught that: the design linter reads colours, sizes and
// motion, not ownership. This does.
//
// Two questions, because a list of owners rots if only one of them is asked:
//   1 · does the named owner still write the thing it is said to own?
//   2 · does any page write it as well?
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';

const PAGES = readdirSync('.').filter(f => f.endsWith('.html') && !f.startsWith('dbg-') && !f.startsWith('al-'));

const OWNED = [
  { what: 'the date line', by: 'clock.js', sel: '.band .date',
    owner: /querySelectorAll\('\.band \.date'\)/, reach: /querySelector(?:All)?\(\s*['"][^'"]*\.date['"]\s*\)/ },
  { what: 'the directory', by: 'hq.js', sel: '.band nav[aria-label="Areas"]',
    owner: /querySelector\('\.band nav\[aria-label="Areas"\]'\)/, reach: /querySelector(?:All)?\(\s*['"][^'"]*nav\[aria-label="Areas"\][^'"]*['"]\s*\)/ },
  { what: 'the bell', by: 'bell.js', sel: '.band .ib[aria-label="Notifications"]',
    owner: /querySelector\('\.band \.ib\[aria-label="Notifications"\]'\)/, reach: /querySelector(?:All)?\(\s*['"][^'"]*aria-label="Notifications"[^'"]*['"]\s*\)/ },
  { what: 'the search button', by: 'search.js', sel: '.band .ib[aria-label="Search"]',
    owner: /querySelector\('\.band \.ib\[aria-label="Search"\]'\)/, reach: /querySelector(?:All)?\(\s*['"][^'"]*aria-label="Search"[^'"]*['"]\s*\)/ },
];

// a write, not a read: reading the band to hang a listener on it is every page's business
const WRITES = /\.(?:textContent|innerHTML|innerText|outerHTML|value)\s*=|\.(?:append|prepend|replaceChildren|insertAdjacentHTML|replaceWith|remove)\s*\(/;

const inlineScripts = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('every owner still writes what it is said to own', () => {
  for (const o of OWNED) {
    const src = readFileSync(o.by, 'utf8');
    assert.match(src, o.owner, `${o.by} no longer writes ${o.what} (${o.sel}) — this list is out of date, not the pages`);
  }
});

test('no page writes a piece of the band the shared scripts own', () => {
  const found = [];
  for (const page of PAGES) {
    for (const code of inlineScripts(readFileSync(page, 'utf8'))) {
      // one statement at a time, so a read on one line and a write on another are not run together
      for (const stmt of code.split(/[;\n]/)) {
        for (const o of OWNED) {
          if (o.reach.test(stmt) && WRITES.test(stmt)) {
            found.push(`${page}: writes ${o.what}, which ${o.by} owns — ${stmt.trim().slice(0, 90)}`);
          }
        }
      }
    }
  }
  assert.deepEqual(found, [], 'the band is painted in one place:\n  ' + found.join('\n  '));
});

// the check has to be able to fail, or it says nothing
test('it catches a page that paints the band itself', () => {
  const guilty = `  document.querySelector('.date').textContent = \`\${C.full(C.now)}\`;`;
  const hits = [];
  for (const stmt of guilty.split(/[;\n]/)) {
    for (const o of OWNED) if (o.reach.test(stmt) && WRITES.test(stmt)) hits.push(o.what);
  }
  assert.deepEqual(hits, ['the date line'], 'the line that was live on three pages must be caught');

  // and a page merely reading the band, to listen to it, is nobody's fault
  const innocent = `  const band = document.querySelector('.band'); band.addEventListener('click', f);`;
  for (const stmt of innocent.split(/[;\n]/)) {
    for (const o of OWNED) assert.ok(!(o.reach.test(stmt) && WRITES.test(stmt)), 'reading the band is allowed');
  }
});
