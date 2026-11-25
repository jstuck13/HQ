// Debug probe: click every state-changing control and report anything that moved when it should not have.
// Loaded into a test copy of a page; writes its findings into document.title for a headless dump to read.
setTimeout(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rect = el => { const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(r.width), Math.round(r.height)]; };
  const snapshot = () => { const m = new Map(); document.querySelectorAll('h2, h3, label, li, .fig, .bogo, input, button').forEach(el => { if (el.offsetParent) m.set(el, rect(el)); }); return m; };
  const findings = [];
  const SEL = 'input[type=checkbox], .seg button, [data-only], .range button';
  const controls = [...document.querySelectorAll(SEL)];
  // a page that re-renders on click replaces the element; find it again by id, else by its position among the same controls
  const refind = (c, i) => c.isConnected ? c : (c.id && document.getElementById(c.id)) || document.querySelectorAll(SEL)[i] || null;
  for (let i = 0; i < Math.min(controls.length, 20); i++) {
    let c = controls[i];
    if (!c.offsetParent) continue;
    const label = (c.getAttribute('aria-label') || c.closest('label')?.textContent || c.textContent || c.id || c.className || 'control').trim().slice(0, 40);
    const before = snapshot(); const own = rect(c); const wasChecked = c.checked;
    const rowSel = 'li, label, .find, .figs, .row', rowBefore = c.closest(rowSel), rowIdx = rowBefore ? [...document.querySelectorAll(rowSel)].indexOf(rowBefore) : -1;
    c.click(); await sleep(250);
    c = refind(c, i); const ownAfter = c ? rect(c) : null;
    if (!c) { findings.push(`${label}: control gone after click`); continue; }
    if (ownAfter && (ownAfter[0] !== own[0] || ownAfter[1] !== own[1])) findings.push(`${label}: the control itself moved ${ownAfter[0]-own[0]}px down, ${ownAfter[1]-own[1]}px right`);
    // its own row: siblings that were above it must not move
    const rb = rowBefore && before.get(rowBefore), row = rowBefore && (rowBefore.isConnected ? rowBefore : document.querySelectorAll(rowSel)[rowIdx]);
    if (rb && row) { const ra = rect(row); if (ra[0] !== rb[0]) findings.push(`${label}: its row moved ${ra[0]-rb[0]}px`); }
    c.click(); await sleep(250);   // put it back (the re-found element, so a re-rendering page really is reset)
    const back = refind(c, i); if (back && back.type === 'checkbox' && back.checked !== wasChecked) findings.push(`${label}: did not return to its first state`);
  }
  document.title = 'SHIFT ' + (findings.length ? findings.join(' | ') : 'none') + ' | tried ' + controls.length;
}, 2500);
