// The widget and its preview must agree about their measurements.
//
// hq-widget.js draws with Scriptable's DrawContext and tools/widget-preview.html draws with CSS and SVG.
// Neither can import the other: the widget has to stay one file you can paste into Scriptable, and the
// preview has to open in a browser with nothing running. So the numbers they share are written out in both,
// in a block marked SPEC, and this test compares the two copies character for character.
//
// They had already drifted twice before it existed, and both times it was only caught by looking at a real
// phone: the jacket was 150 wide in one and 132 in the other, and the seam was held in radians in one and as
// a fraction of the circle in the other. Neither is the sort of thing a screenshot of the preview can show.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const START = '// ---- SPEC: shared with the other renderer';
const END = '// ---- end SPEC ----';

const block = (path) => {
  const src = readFileSync(path, 'utf8');
  const a = src.indexOf(START);
  assert.notEqual(a, -1, `${path} has no SPEC block`);
  const b = src.indexOf(END, a);
  assert.notEqual(b, -1, `${path} has no end to its SPEC block`);
  return src.slice(a, b + END.length);
};

test('the widget and its preview carry the same SPEC, to the character', () => {
  const widget = block('hq-widget.js');
  const preview = block('tools/widget-preview.html');
  if (widget !== preview) {
    // say which lines differ rather than printing two walls of text
    const w = widget.split('\n'), p = preview.split('\n');
    const diff = [];
    for (let i = 0; i < Math.max(w.length, p.length); i++) {
      if (w[i] !== p[i]) diff.push(`  line ${i + 1}\n    widget : ${w[i] ?? '(missing)'}\n    preview: ${p[i] ?? '(missing)'}`);
    }
    assert.fail('the two renderers have drifted:\n' + diff.join('\n'));
  }
});

test('the SPEC parses, and says the things both renderers read', () => {
  const SPEC = new Function(block('hq-widget.js').replace(/^\/\/.*$/gm, '') + '\nreturn SPEC;')();
  assert.ok(SPEC.tile.large[0] > SPEC.tile.small, 'a large tile is wider than a small one');
  assert.ok(SPEC.dial.stroke > 0 && SPEC.dial.stroke < 0.5, 'the ring stroke is a fraction of the dial');
  assert.ok(SPEC.dial.seamRadians > 0 && SPEC.dial.seamRadians < Math.PI, 'the seam is an angle, not a fraction');
  assert.ok(SPEC.jacket.width + SPEC.jacket.gap < SPEC.tile.large[0], 'the jacket leaves room for the column beside it');
  for (const [k, v] of Object.entries(SPEC.arc)) assert.match(v, /^#[0-9A-F]{6}$/i, `${k} is a hex colour`);
  assert.match(SPEC.nowInk, /^#[0-9A-F]{6}$/i);
});

test('every colour the dial draws with is one the pages know', () => {
  // the arcs use DESIGN.md's dark-ground ramp, not the calendar page's paper tints, which glare on the band
  const css = readFileSync('hq.css', 'utf8').toLowerCase();
  for (const [k, v] of Object.entries({ ...JSON.parse(JSON.stringify(
    new Function(block('hq-widget.js').replace(/^\/\/.*$/gm, '') + '\nreturn SPEC;')().arc)) })) {
    assert.ok(css.includes(v.toLowerCase()), `${k} (${v}) is not a colour in hq.css`);
  }
});
