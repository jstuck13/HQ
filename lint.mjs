// Guards the three things that drift: the type scale, the palette, and motion.
//
//   node lint.mjs              check every page
//   node lint.mjs --selfcheck  prove the rules still catch what they claim to
//
// In an .html file, sizes and motion are read from <style> blocks only. In .css and the shared .js files they
// are read throughout: CSS inside a script string (a cssText, a styled template) is still CSS, and is where
// the drift hides best. Colours are read from the whole of every file, because a page also hands colours to
// CSS from JavaScript (an SVG stroke, an inline --c) and those drift just as easily.
// The .mjs tooling here (this file, check.mjs, bump.mjs) is not shipped and is not linted — this one carries
// example colours in its own self-check and would flag itself.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert';

// The scale from DESIGN.md, plus the four tiers the build proved it needed: prose 16.5, sub-caption 11.5,
// the version stamp 10.5/10, display-tight 30, and the splash mark 44.
const SCALE = new Set([10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 20, 22, 24, 26, 30, 32, 40, 44]);
// Motion has tiers because it does different jobs. A duration is fine if it is one of them; anything else is drift.
const MOTION = { '0s': 'none', '.12s': 'track', '.15s': 'nudge', '.45s': 'curtain', '.6s': 'draw', '2s': 'lamp' };
// hq.css *is* the palette: every colour the system sanctions already appears in it, so there is no second list to keep.
const PALETTE = new Set((readFileSync('hq.css', 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(h => h.toLowerCase()));

const CSS_ONLY = [
  [/font-size:\s*([0-9.]+)px/g, m => !SCALE.has(+m[1]) && `font-size ${m[1]}px is off the scale`],
  [/transition[^;}]*?\s([0-9.]+m?s)/g,
   m => !MOTION[m[1]] && `transition ${m[1]} is not a motion tier (${Object.keys(MOTION).filter(k => k !== '0s').join(', ')})`],
];
// index.html is the cover: it ships standalone without hq.css and carries its own copy of the palette.
const ANYWHERE = file => [
  [/(?<!href=["'])#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g,
   m => file !== 'index.html' && !PALETTE.has(m[0].toLowerCase()) && `${m[0]} is not a colour in hq.css`],
];

function lint(file, text) {
  const out = [], always = ANYWHERE(file);
  let inStyle = file.endsWith('.css') || file.endsWith('.js');   // no <style> to wait for
  const test = (checks, line, i) => {
    for (const [re, say] of checks) for (const m of line.matchAll(re)) {
      const said = say(m); if (said) out.push(`${file}:${i + 1}  ${said}`);
    }
  };
  text.split('\n').forEach((line, i) => {
    if (/<style/.test(line)) inStyle = true;
    test(always, line, i);
    if (inStyle) test(CSS_ONLY, line, i);
    if (/<\/style>/.test(line)) inStyle = false;
  });
  return out;
}

if (process.argv[2] === '--selfcheck') {
  assert.equal(lint('t.css', 'a{font-size:18px;color:#ABCDEF;transition:color .2s}').length, 3, 'should catch all three');
  assert.equal(lint('t.css', 'a{font-size:17px;color:var(--ink);transition:color .15s}').length, 0, 'should pass clean CSS');
  assert.equal(lint('t.html', 'a{font-size:18px}').length, 0, 'sizes outside a <style> block are not CSS');
  assert.equal(lint('t.html', "bars(v, '#ABCDEF')").length, 1, 'a colour handed to CSS from script still counts');
  assert.equal(lint('t.html', '<a href="#abc">x</a>').length, 0, 'a page fragment is not a colour');
  assert.equal(lint('index.html', 'a{color:#ABCDEF}').length, 0, 'the cover carries its own palette');
  assert.equal(lint('x.js', "e.style.cssText='font-size:18px'").length, 1, 'CSS inside a script is still CSS');
  assert.equal(lint('x.js', "e.style.cssText='font-size:17px'").length, 0, 'and passes when it is on the scale');
  console.log('selfcheck ok');
  process.exit(0);
}

const here = readdirSync('.');
const files = ['hq.css',
  ...here.filter(f => f.endsWith('.html')).sort(),
  ...here.filter(f => f.endsWith('.js')).sort()];   // .js only: the shipped scripts, never the .mjs tooling
const found = files.flatMap(f => lint(f, readFileSync(f, 'utf8')));
found.forEach(f => console.log(f));
console.log(`\n${found.length} ${found.length === 1 ? 'finding' : 'findings'} across ${files.length} files`);
process.exit(found.length ? 1 : 0);
