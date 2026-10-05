// Guards the three things that drift: the type scale, the palette, and motion.
//
//   node lint.mjs              check every page
//   node lint.mjs --selfcheck  prove the rules still catch what they claim to
//
// Only <style> blocks are read (and hq.css whole), so a hex inside a script string is left alone.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert';

// The scale from DESIGN.md, plus the two steps the build genuinely leans on (14, 15.5) and the splash mark (44).
const SCALE = new Set([11, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17, 20, 22, 24, 26, 32, 40, 44]);
const TIMING = new Set(['0s', '.15s', '.45s']);   // one hover nudge, one splash fade, nothing else
// hq.css *is* the palette: every colour the system sanctions already appears in it, so there is no second list to keep.
const PALETTE = new Set((readFileSync('hq.css', 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(h => h.toLowerCase()));

// index.html is the cover: it ships standalone without hq.css and carries its own copy of the palette, so it is exempt from that one rule.
const rules = file => [
  [/font-size:\s*([0-9.]+)px/g, m => !SCALE.has(+m[1]) && `font-size ${m[1]}px is off the scale`],
  [/#[0-9a-fA-F]{3,8}\b/g,     m => file !== 'index.html' && !PALETTE.has(m[0].toLowerCase()) && `${m[0]} is not a colour in hq.css`],
  [/transition[^;}]*?\s([0-9.]+m?s)/g, m => !TIMING.has(m[1]) && `transition ${m[1]} is not .15s or .45s`],
];

function lint(file, text) {
  const out = [], checks = rules(file);
  let inStyle = file.endsWith('.css');
  text.split('\n').forEach((line, i) => {
    if (/<style/.test(line)) inStyle = true;
    if (inStyle) for (const [re, say] of checks) for (const m of line.matchAll(re)) {
      const said = say(m); if (said) out.push(`${file}:${i + 1}  ${said}`);
    }
    if (/<\/style>/.test(line)) inStyle = false;
  });
  return out;
}

if (process.argv[2] === '--selfcheck') {
  assert.equal(lint('t.css', 'a{font-size:18px;color:#ABCDEF;transition:color .2s}').length, 3, 'should catch all three');
  assert.equal(lint('t.css', 'a{font-size:17px;color:var(--ink);transition:color .15s}').length, 0, 'should pass clean CSS');
  assert.equal(lint('t.html', 'a{font-size:18px}').length, 0, 'should ignore CSS outside a <style> block');
  assert.equal(lint('index.html', 'a{color:#ABCDEF}').length, 0, 'the cover carries its own palette');
  console.log('selfcheck ok');
  process.exit(0);
}

const files = ['hq.css', ...readdirSync('.').filter(f => f.endsWith('.html')).sort()];
const found = files.flatMap(f => lint(f, readFileSync(f, 'utf8')));
found.forEach(f => console.log(f));
console.log(`\n${found.length} ${found.length === 1 ? 'finding' : 'findings'} across ${files.length} files`);
process.exit(found.length ? 1 : 0);
