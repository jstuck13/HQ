// Click everything on a page and look for a mess afterwards.
//
// Not "did something move" — plenty of clicks are meant to move things. What this looks for is the kinds of
// wrong a person would call a formatting error: the page growing a sideways scrollbar, text spilling out of
// the box it lives in, a figure rendering as undefined or NaN or [object Object] or Invalid Date, a control
// vanishing without a replacement, the page collapsing, or anything throwing.
(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const errs = [];
  addEventListener('error', e => errs.push('error: ' + e.message));
  addEventListener('unhandledrejection', e => errs.push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));

  const BAD_TEXT = /\b(undefined|NaN|\[object Object\]|Invalid Date|null)\b/;
  const SKIP = ['#clear-yes', '#clear-no', '#menubtn'];          // wiping the fixture ends the sweep early

  const overflows = () => {
    const out = [];
    const d = document.documentElement;
    if (d.scrollWidth > d.clientWidth + 1) out.push(`the page scrolls sideways by ${d.scrollWidth - d.clientWidth}px`);
    for (const el of document.querySelectorAll('main *, header *, .foot *')) {
      if (!el.offsetParent && el.tagName !== 'BODY') continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX !== 'visible' || cs.position === 'fixed') continue;   // a box that is meant to scroll is not a fault
      if (el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
        const tag = el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase();
        out.push(`${tag} spills ${el.scrollWidth - el.clientWidth}px past its edge`);
      }
    }
    return [...new Set(out)];
  };

  const rubbish = () => {
    const out = [];
    for (const el of document.querySelectorAll('main *, header *')) {
      if (el.children.length) continue;                          // only the leaves, so a phrase is not reported twice
      const t = (el.textContent || '').trim();
      if (t && BAD_TEXT.test(t)) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: “${t.slice(0, 48)}”`);
    }
    return [...new Set(out)].slice(0, 4);
  };

  const name = el => (el.id ? '#' + el.id : '') + (el.getAttribute('aria-label') || el.textContent || el.value || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 26);

  setTimeout(async () => {
    const findings = [];
    const before = { overflow: overflows(), rubbish: rubbish() };
    if (before.overflow.length) findings.push('on arrival — ' + before.overflow.join('; '));
    if (before.rubbish.length) findings.push('on arrival — ' + before.rubbish.join('; '));

    const sel = 'button:not([disabled]), summary, input[type=checkbox], input[type=radio], [role="button"]';
    const all = [...document.querySelectorAll(sel)].filter(el => el.offsetParent && !SKIP.some(s => el.matches(s)));
    let clicked = 0, gone = 0;

    for (let i = 0; i < all.length && i < 60; i++) {
      const el = all[i];
      if (!el.isConnected || !el.offsetParent) { gone++; continue; }
      const label = name(el);
      const hBefore = document.documentElement.scrollHeight;
      try { el.click(); } catch (e) { findings.push(`${label}: threw on click — ${e.message}`); continue; }
      clicked++;
      await w(220);

      const o = overflows().filter(x => !before.overflow.includes(x));
      if (o.length) findings.push(`${label}: ${o.join('; ')}`);
      const r = rubbish().filter(x => !before.rubbish.includes(x));
      if (r.length) findings.push(`${label}: ${r.join('; ')}`);
      const hAfter = document.documentElement.scrollHeight;
      if (hAfter < 200 && hBefore >= 200) findings.push(`${label}: the page collapsed to ${hAfter}px`);
      if (errs.length) { findings.push(`${label}: ${errs.join(' ~ ')}`); errs.length = 0; }
    }

    document.title = `clicked ${clicked} of ${all.length}${gone ? `, ${gone} had gone` : ''} | ` + (findings.length ? findings.slice(0, 6).join(' || ') : 'nothing amiss');
  }, 2600);
})();
