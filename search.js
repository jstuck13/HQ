// The search: one box, every page's document, results that jump to the thing. One script, every page.
(function () {
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => window.clock ? clock.today : new Date().toISOString().slice(0, 10);
  const day = iso => iso && window.clock ? clock.dayMonth(clock.fromISO(iso)) : iso || "";   // 2026-09-15 → 15 Sep

  // each source: load its document, turn it into {area, title, sub, href} rows
  const SOURCES = [
    ['calendar', d => (d.series || []).map(s => ({ area: 'Calendar', title: s.title, sub: [day(s.date), s.sub].filter(Boolean).join(' · '), href: `calendar.html?d=${s.date}&e=${encodeURIComponent(s.id)}` }))],
    ['school', d => [...(d.courses || []).map(c => ({ area: 'School', title: c.name, sub: 'course', href: 'school.html' })),
                     ...(d.items || []).map(i => ({ area: 'School', title: i.title, sub: [(d.courses || []).find(c => c.id === i.course)?.name, i.due ? 'due ' + clock.monthShort(clock.fromISO(i.due)) + ' ' + clock.fromISO(i.due).getDate() : '', i.done ? 'done' : ''].filter(Boolean).join(' · '), href: 'school.html' }))]],
    ['library', d => (d.books || []).map(b => ({ area: 'Library', title: b.title, sub: [b.author, { reading: 'reading', toread: 'to read', read: 'read' }[b.shelf]].filter(Boolean).join(' · '), href: `library.html?open=${encodeURIComponent(b.id)}` }))],
    ['finances.' + today().slice(0, 7), d => [...(d.tx || []).map(t => ({ area: 'Finances', title: t.what || '', sub: [day(t.date), t.amt != null ? '$' + t.amt : ''].filter(Boolean).join(' · '), href: 'finances.html' })),
                            ...(d.cats || []).map(c => ({ area: 'Finances', title: c.name, sub: c.limit ? 'limit $' + c.limit : 'category', href: 'finances.html' }))]],
    ['health', d => [...(d.next || []).map(n => ({ area: 'Health', title: n.name, sub: [day(n.date), n.note].filter(Boolean).join(' · '), href: 'health.html' })),
                     ...(d.meds || []).map(m => ({ area: 'Health', title: m.name, sub: m.when || 'pill', href: 'health.html' }))]],
    ['groceries', d => [...(d.list || []).map(l => ({ area: 'Groceries', title: l.text, sub: l.done ? 'got it' : 'on the list', href: 'groceries.html' })),
                      ...Object.values((d.trips || []).reduce((m, t) => { t.items.forEach(i => { m[i.name.toLowerCase()] ??= { area: 'Groceries', title: i.name, sub: `${'$' + i.price} at ${t.store}, ${day(t.date)}`, href: 'groceries.html' }; }); return m; }, {}))]],
    ['today.' + today(), d => (d.items || []).map(i => ({ area: 'Today', title: i.text, sub: i.done ? 'done' : 'to do', href: 'today.html' }))],
  ];
  let rows = null;
  const gather = async () => { if (rows) return rows; const docs = await Promise.all(SOURCES.map(([k]) => store.load(k).catch(() => null))); rows = docs.flatMap((d, i) => d ? SOURCES[i][1](d) : []).filter(r => r.title); return rows; };

  const style = document.createElement('style');
  style.textContent = `
    .srch{position:absolute;right:0;top:calc(100% + 10px);width:min(420px,calc(100vw - 40px));background:var(--card);color:var(--ink);border-radius:16px;box-shadow:var(--shadow);padding:14px 18px 10px;z-index:21;text-align:left}
    .srch input{width:100%;font-family:var(--serif);font-size:17px;color:var(--ink);border-bottom:1px solid var(--ink);padding:4px 0 6px;background:none}
    .srch input::placeholder{color:var(--ink-3);font-style:italic}
    .srch input:focus{outline:none}
    .srch ul{max-height:min(420px,60vh);overflow:auto;margin:4px 0 0}
    .srch li a{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:9px 0;border-bottom:1px dotted var(--rule);font-size:13.5px}
    .srch li:last-child a{border-bottom:0}
    .srch li a:hover,.srch li a:focus{background:var(--paper)}
    .srch .t{font-family:var(--serif);font-size:15px}
    .srch .t mark{background:none;color:var(--ox)}
    .srch .s{grid-column:1;color:var(--ink-3);font-size:12.5px}
    .srch .a{grid-column:2;grid-row:1/3;align-self:center;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
    .srch .none{padding:12px 0 6px;color:var(--ink-3);font-style:italic;font-family:var(--serif);font-size:14px}`;
  document.head.appendChild(style);

  addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.band .ib[aria-label="Search"]'); if (!btn || !window.store) return;
    btn.setAttribute('aria-expanded', 'false');
    let pop = null;
    const hi = (t, q) => { const i = t.toLowerCase().indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
    const render = async q => {
      const list = pop.querySelector('ul'); q = q.trim().toLowerCase();
      if (!q) { list.innerHTML = ''; return; }
      const hits = (await gather()).filter(r => (r.title + ' ' + r.sub).toLowerCase().includes(q)).slice(0, 30);
      const add = q.length >= 3 && !hits.some(r => r.area === 'Library') ? `<li><a href="library.html?find=${encodeURIComponent(q)}"><span class="t">Add “${esc(q)}” to the Library</span><span class="s">search Open Library for it</span><span class="a">Library</span></a></li>` : '';
      list.innerHTML = hits.length || add ? hits.map(r => `<li><a href="${r.href}"><span class="t">${hi(r.title, q)}</span><span class="s">${esc(r.sub)}</span><span class="a">${r.area}</span></a></li>`).join('') + add : '<li class="none">Nothing matches.</li>';
    };
    const open = () => { if (!pop) { pop = document.createElement('div'); pop.className = 'srch'; pop.innerHTML = '<input type="text" autocomplete="off" placeholder="Search everything" aria-label="Search"><ul></ul>'; btn.parentElement.appendChild(pop); pop.querySelector('input').addEventListener('input', e => render(e.target.value)); }
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); pop.querySelector('input').focus(); pop.querySelector('input').select(); };
    const close = () => { if (pop) pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => { e.stopPropagation(); (pop && !pop.hidden) ? close() : open(); });
    document.addEventListener('click', e => { if (pop && !pop.hidden && !pop.contains(e.target)) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }   // `/` opens it from anywhere
    });
  });
})();
