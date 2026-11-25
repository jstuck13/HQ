// An alignment probe. Columns in a list should share an edge, headings should share the page's left margin,
// and nothing should sit outside what contains it. Measures rather than eyeballs; writes its findings into the
// title for a headless dump to read.
setTimeout(() => {
  const R = el => el.getBoundingClientRect();
  const out = [];
  const say = t => out.push(t);
  const near = (a, b) => Math.abs(a - b) <= 1.01;

  // 1 · a repeated list: every row's nth cell should start (and for right-aligned ones, end) on one line
  document.querySelectorAll('ul, ol').forEach(list => {
    const rows = [...list.children].filter(li => li.tagName === 'LI' && li.offsetParent && !li.classList.contains('empty') && !li.classList.contains('head'));
    if (rows.length < 2) return;
    // A list whose items are dealt into columns — a grid of several tracks, or a wrapping flex — has no rows to
    // compare. Item four sits beneath item one, so of course its cells share no edge with item two's. Asking
    // the question of such a list is what produced most of this probe's noise, and noise is how a report that
    // says "7 to look at" every single run stops being read at all.
    const lcs = getComputedStyle(list);
    const tracks = (lcs.gridTemplateColumns || 'none').split(/\s+/).filter(x => x && x !== 'none').length;
    if (lcs.display.includes('grid') && tracks > 1) return;
    if (lcs.display.includes('flex') && lcs.flexWrap === 'wrap') return;
    const sig = li => [...li.children].map(c => c.className || c.tagName).join('|');
    const byShape = {};
    rows.forEach(li => (byShape[sig(li)] ??= []).push(li));
    for (const [shape, group] of Object.entries(byShape)) {
      if (group.length < 2) continue;
      const n = group[0].children.length;
      for (let i = 0; i < n; i++) {
        const cells = group.map(li => li.children[i]).filter(c => c && c.offsetParent);
        if (cells.length < 2) continue;
        const ls = cells.map(c => R(c).left), rs = cells.map(c => R(c).right);
        const lSpread = Math.max(...ls) - Math.min(...ls), rSpread = Math.max(...rs) - Math.min(...rs);
        const cls = (cells[0].className || cells[0].tagName).toString().slice(0, 18);
        // a cell is aligned on one edge or the other; both drifting is the fault
        if (lSpread > 1.5 && rSpread > 1.5) say(`${list.id || list.className || 'list'} col${i} .${cls}: left varies ${lSpread.toFixed(1)}px, right varies ${rSpread.toFixed(1)}px over ${cells.length} rows`);
      }
    }
  });

  // 2 · two lists that look like one table: a second list under the first should keep its columns
  const sameLook = {};
  document.querySelectorAll('ul[class]').forEach(u => { if (u.offsetParent) (sameLook[u.className] ??= []).push(u); });
  for (const [cls, lists] of Object.entries(sameLook)) {
    if (lists.length < 2) continue;
    const firstCells = li => [...li.children].map(c => R(c).left);
    // Two lists side by side are two columns of a spread, not one table continued, and their columns have no
    // reason to agree. Only a list that genuinely sits below the first is a continuation of it.
    const ra = R(lists[0]), rb = R(lists[1]);
    if (rb.top < ra.bottom - 2) continue;
    const a = lists[0].querySelector('li:not(.head):not(.empty)'), b = lists[1].querySelector('li:not(.head):not(.empty)');
    if (!a || !b || a.children.length !== b.children.length) continue;
    const A = firstCells(a), B = firstCells(b);
    const off = A.map((x, i) => Math.abs(x - B[i])).filter(d => d > 1.5);
    if (off.length) say(`two "${cls}" lists do not share columns: ${A.map((x, i) => Math.round(x - B[i])).join(', ')}px apart`);
  }

  // 3 · section headings and the blocks under them should share the page's left edge
  const main = document.querySelector('main');
  if (main) {
    const mainLeft = R(main).left + parseFloat(getComputedStyle(main).paddingLeft || 0);
    const cols = {};
    main.querySelectorAll('h2, h3, ul, .ledger, .held, .words, .tally, .digest').forEach(el => {
      if (!el.offsetParent || R(el).width < 80) return;
      const l = Math.round(R(el).left);
      (cols[l] ??= []).push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
    });
    const edges = Object.keys(cols).map(Number).sort((a, b) => a - b);
    // a page has as many left edges as it has columns; a stray one within a few px of another is drift
    for (let i = 1; i < edges.length; i++) {
      const d = edges[i] - edges[i - 1];
      if (d > 1 && d < 12) say(`left edges ${edges[i - 1]} and ${edges[i]} are ${d}px apart: ${cols[edges[i - 1]].slice(0, 3)} vs ${cols[edges[i]].slice(0, 3)}`);
    }
  }

  // 4 · nothing sitting outside what holds it
  document.querySelectorAll('main *, header *').forEach(el => {
    if (!el.offsetParent || !el.parentElement) return;
    const r = R(el), p = R(el.parentElement);
    if (p.width < 40 || getComputedStyle(el.parentElement).overflow !== 'visible') return;
    if (r.right > p.right + 2 && r.width < p.width) say(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 16)} spills ${Math.round(r.right - p.right)}px past its parent`);
  });

  // 5 · the words, not the boxes. Siblings on one line should share a text baseline — an element box can match
  //     exactly while the glyphs inside it do not, which is how a <button> beside <a>s went unnoticed.
  const textTop = el => { const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return b.height ? b.top : null; };
  document.querySelectorAll('nav, .row, .acts, .meta, .legend, .nav, .filters, .seg, .days').forEach(wrap => {
    const kids = [...wrap.children].filter(k => k.offsetParent && k.textContent.trim() && !k.children.length);
    if (kids.length < 2) return;
    // only words set the same way can be compared this way: a 20px mark and a 13.5px date share a baseline
    // while their text boxes never share a top. Group by how the type is set, then compare within each group.
    const groups = {};
    kids.forEach(k => { const cs = getComputedStyle(k); (groups[`${cs.fontSize}/${cs.fontFamily}`] ??= []).push(k); });
    for (const [how, group] of Object.entries(groups)) {
      if (group.length < 2) continue;
      const tops = group.map(textTop).filter(t => t != null);
      if (tops.length < 2) continue;
      const spread = Math.max(...tops) - Math.min(...tops);
      if (spread > 0.6) {
        const worst = group[tops.indexOf(Math.max(...tops))];
        say(`${wrap.tagName.toLowerCase()}.${String(wrap.className).slice(0, 14)} (${how.split('/')[0]}): text sits ${spread.toFixed(1)}px apart — "${worst.textContent.trim().slice(0, 14)}" (${worst.tagName}) lowest`);
      }
    }
  });

  const d = document.documentElement;
  if (d.scrollWidth > d.clientWidth + 1) say(`page scrolls sideways by ${d.scrollWidth - d.clientWidth}px`);

  document.title = 'ALIGN ' + (out.length ? out.slice(0, 14).join(' || ') : 'none') + ` (${out.length} found)`;
}, 2600);
