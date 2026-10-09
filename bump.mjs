// Set the version in the four places that must agree, and say what changed.
//
//   node bump.mjs patch "Garmin says why a metric came back empty"
//   node bump.mjs minor "Today: one box that works out what you meant"
//   node bump.mjs major "Entries made here are written to Google Calendar"
//
// patch — a fix or a refinement to something that already worked
// minor — a new feature on a page that already exists
// major — a new page, or something the app can now do outside itself
//
// version.json is fetched fresh by every page; the copies baked into hq.js and index.html are what a page
// that came from the offline shell believes it is. When they disagree, the page offers to fetch the newer one.
import { readFileSync, writeFileSync } from 'node:fs';

const [kind, ...rest] = process.argv.slice(2);
const said = rest.join(' ').trim();
if (!['major', 'minor', 'patch'].includes(kind)) {
  console.error('usage: node bump.mjs <major|minor|patch> "what changed"');
  process.exit(1);
}

const current = JSON.parse(readFileSync('version.json', 'utf8'));
let [a, b, c] = current.v.split('.').map(Number);
if (kind === 'major') { a++; b = 0; c = 0; }
else if (kind === 'minor') { b++; c = 0; }
else c++;
const v = `${a}.${b}.${c}`;
const at = new Date().toISOString().slice(0, 10);

writeFileSync('version.json', JSON.stringify({ v, at, said: said || current.said }, null, 2) + '\n');

const swap = (file, re, make) => {
  const s = readFileSync(file, 'utf8');
  const m = s.match(re);
  if (!m) { console.error(`could not find the version in ${file}`); process.exit(1); }
  writeFileSync(file, s.replace(re, make));
};
swap('hq.js', /const HQ_VERSION = '[^']+';/, `const HQ_VERSION = '${v}';`);
swap('index.html', /const PAGE_VERSION = '[^']+';/, `const PAGE_VERSION = '${v}';`);
// The offline shell is named for the version it holds, so a release always empties the last one. Without this
// a change to hq.css or a shared script reaches a new visitor and not the installed app, which is the worse
// of the two failures: it looks like it shipped.
swap('sw.js', /const V = 'hq-shell-[^']+';/, `const V = 'hq-shell-${v}';`);

console.log(`${current.v} → ${v}${said ? ' · ' + said : ''}`);
