// HQ — the few helpers every page writes the same way, and the band's menu button. Loaded after clock.js, before the page.
const F = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const h12 = h => { const hr=Math.floor(h), m=Math.round((h%1)*60); return `${hr%12||12}.${String(m).padStart(2,'0')} ${hr<12?'am':'pm'}`; };   // 8.5 → 8.30 am
const hrs = m => m>=60 ? (m%60 ? `${Math.floor(m/60)} h ${m%60}` : `${m/60} h`) : `${m} min`;                                            // 95 → 1 h 35
const $0 = n => (n<0?'−':'') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');                                                    // 2194.4 → $2,194
// Some Canvas assignments are only a column for a mark: a quiz sat in the lab, attendance, a paper handed over
// in person. Its due date is when the teacher enters the score, not when anything is owed — so it is never
// something to do, wherever School's items are read.
const toDo = i => !i.done && !i.noturn;
// The version this copy of the app was built with. version.json holds the same number and is never cached,
// so a page that has been open — or served from the offline shell — can tell when a newer one has been deployed.
const HQ_VERSION = '4.25.1';

// a newer version is not forced on you mid-sentence: it says so, and waits to be asked
async function watchVersion(){
  const look = async () => {
    try {
      const r = await fetch('/version.json', { cache: 'no-store' });
      if (!r.ok) return;
      const v = (await r.json()).v;
      if (v && v !== HQ_VERSION) offerUpdate(v);
    } catch {}
  };
  await look();
  // A tab left open all day would otherwise never ask again: it looks on returning to the tab, and every ten
  // minutes while it is being looked at. The notice only ever appears when this copy is genuinely behind.
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
  setInterval(() => { if (document.visibilityState === 'visible') look(); }, 600000);
}
const freshStart = async () => { try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('hq-shell')).map(k => caches.delete(k))); } catch {} };
let offered = false;
function offerUpdate(v){
  if (offered) return; offered = true;
  const bar = document.createElement('div');
  bar.className = 'hq-newer';
  bar.innerHTML = `<span>Version ${v} is ready.</span><button type="button">Reload</button><button type="button" class="later" aria-label="Not now">\u00d7</button>`;
  bar.querySelector('button').addEventListener('click', async () => {
    await freshStart();                                       // so the reload fetches the new files rather than the kept ones
    location.reload();
  });
  bar.querySelector('.later').addEventListener('click', () => bar.remove());
  document.body.appendChild(bar);
}
addEventListener('DOMContentLoaded', () => { if (location.protocol.startsWith('http')) watchVersion(); });

// the splash (hq.css) covers the page until its first documents have answered and drawn — store.js calls hqReveal — 4 s at the most
{ const t0 = Date.now(); let gone = false;
  window.hqReveal = () => { if (gone) return; gone = true; setTimeout(() => document.body.classList.add('hq-in'), Math.max(0, 250 - (Date.now() - t0))); };   // held 250 ms so it reads as a mark, not a flicker
  setTimeout(window.hqReveal, 4000); }
// A contained scroll should say there is more below it. Pages rebuild their lists, so the boxes are found
// again whenever the document changes rather than once at load.
{ const seen = new WeakSet();
  const mark = el => el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  const ro = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => mark(e.target))) : null;
  const scan = () => document.querySelectorAll('.scrollbox').forEach(el => {
    mark(el);
    if (seen.has(el)) return; seen.add(el);
    el.addEventListener('scroll', () => mark(el), { passive: true });
    ro && ro.observe(el);
  });
  addEventListener('DOMContentLoaded', () => { scan(); new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); });
  addEventListener('resize', scan); }

// A chart on its own: the whole screen, drawn again at that size by the page that owns it, so there is no
// second copy of the drawing to keep in step. The address carries a #name, which makes it survive a reload
// and lets the phone's back gesture close it like leaving a page.
{
  const charts = new Map();
  let dlg = null, open = null, restored = false;

  const box = () => dlg.querySelector('.box');
  // how tall a chart should be drawn in a box this size: it takes the room, but stays wider than it is tall
  // on a phone, where the box is a tall rectangle and a chart the same shape would be unreadable.
  // A chart that fits takes the room but stays wider than tall, since a chart the shape of a phone reads badly.
  // One that is already scrolling sideways has no such worry, and takes the whole height.
  let widened = false, shrink = 0;
  window.zoomHeight = (w, tall) => Math.round(Math.max(160, (widened ? tall : Math.min(tall, Math.max(w*0.55, tall*0.6))) - shrink));
  // On a narrow screen a month of readings squeezed into 390px is a scribble. The drawing takes the width its
  // data needs and the box scrolls sideways to it; on a screen already wider than that, nothing changes.
  // While it scrolls, a sideways drag belongs to the scroll rather than to reading a point, which a tap still does.
  window.zoomWidth = (box, slots, gap = 24) => {
    const w = Math.max(box.clientWidth, Math.min(Math.round(slots * gap), 3200));
    box.style.setProperty('--zw', w + 'px');
    widened = w > box.clientWidth + 1;                  // read by zoomHeight, which is always called right after
    box.classList.toggle('wide', widened);
    return w;
  };
  const draw = () => { const c = charts.get(open); if (!c) return; const b = box();
    const paint = () => { b.innerHTML = ''; b.style.setProperty('--zw', '100%'); b.classList.remove('wide'); widened = false; c.draw(b); };
    shrink = 0; paint();
    // a figure, a caption and a legend take a line on a wide screen and three on a phone: rather than guess,
    // draw it, measure what spilled, and give the drawing that much less. One correction is always enough.
    if (b.scrollHeight > b.clientHeight + 4) { shrink = b.scrollHeight - b.clientHeight + 4; paint(); shrink = 0; }
    if (b.classList.contains('wide')) b.scrollLeft = b.scrollWidth;   // a chart wider than the screen opens at its latest, not a month ago
  };
  const leave = () => { if (history.state && history.state.hqZoom) history.back(); else shut(); };
  const shut = () => { open = null; if (dlg && dlg.open) dlg.close(); if (location.hash) history.replaceState(null, '', location.pathname + location.search); };

  function build(){
    dlg = document.createElement('dialog');
    dlg.className = 'hq-zoom';
    dlg.innerHTML = '<div class="in" tabindex="-1" autofocus><header><h2></h2><button type="button" class="x" aria-label="Close">Close</button></header><div class="box chart"></div></div>';
    dlg.querySelector('.x').addEventListener('click', leave);
    dlg.addEventListener('cancel', e => { e.preventDefault(); leave(); });          // Escape leaves the same way the button does
    document.body.appendChild(dlg);
    let w = innerWidth, h = innerHeight;
    addEventListener('resize', () => { if (!open) return; if (Math.abs(innerWidth-w) < 2 && Math.abs(innerHeight-h) < 60) return; w = innerWidth; h = innerHeight; draw(); });   // a phone keyboard or a toolbar is not a resize
  }

  function show(name){
    const c = charts.get(name); if (!c) return;
    if (!dlg) build();
    open = name;
    dlg.querySelector('h2').textContent = c.title;
    if (!dlg.open) dlg.showModal();
    draw();
  }

  // el is the chart in the page; drawFn(target) draws the same chart into whatever box it is handed
  window.zoomable = (el, name, title, drawFn) => {
    charts.set(name, { title, draw: drawFn });
    if (open === name) draw();                                                      // the page re-rendered under an open chart
    if (el) {
      el.classList.add('hq-expandable');
      if (!el.querySelector(':scope > .hq-expand')) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'hq-expand'; b.textContent = 'Expand';
        b.setAttribute('aria-label', `See ${title} full screen`);
        b.addEventListener('click', () => { history.pushState({ hqZoom: name }, '', '#' + name); show(name); });
        el.appendChild(b);
      }
    }
    if (!restored && location.hash.slice(1) === name) {                             // a reload on #name comes back to it
      restored = true; history.replaceState({ hqZoom: name }, '', '#' + name); show(name);
    }
  };
  addEventListener('popstate', () => { const n = history.state && history.state.hqZoom; if (n) show(n); else { open = null; if (dlg && dlg.open) dlg.close(); } });
}

// Every page HQ has, in one place. The band shows the ones you want in it and "More" holds the rest, so a page
// is never unreachable — which is how Patterns ended up with no way in at all. Which six are in the band, and in
// what order, is kept with the other documents; a page added later is out of the band but always in More.
const HQ_PAGES = [
  { id: 'today', name: 'Today', file: 'today.html' },
  { id: 'calendar', name: 'Calendar', file: 'calendar.html' },
  { id: 'finances', name: 'Finances', file: 'finances.html' },
  { id: 'investments', name: 'Investments', file: 'investments.html' },
  { id: 'groceries', name: 'Groceries', file: 'groceries.html' },
  { id: 'library', name: 'Library', file: 'library.html' },
  { id: 'school', name: 'School', file: 'school.html' },
  { id: 'health', name: 'Health', file: 'health.html' },
  { id: 'study', name: 'The Study', file: 'study.html' },
  { id: 'list', name: 'The list', file: 'list.html' },
  { id: 'review', name: 'The week', file: 'review.html' },
  { id: 'span', name: 'A month, a year', file: 'span.html' },
  { id: 'patterns', name: 'Patterns', file: 'patterns.html' },
  { id: 'day', name: 'Another day', file: 'day.html' },
  { id: 'restore', name: 'Restore', file: 'restore.html' },
];
const HQ_BAND = ['today', 'calendar', 'finances', 'library', 'school', 'health'];   // what the band holds until you say otherwise
window.HQ_PAGES = HQ_PAGES;   // the search box navigates by this list too

// One door to the preferences document. Four things write to it now — the band, the state of affairs, what the
// bell watches, and what the nudges may say — and each used to merge onto its own snapshot, so whichever wrote
// last could drop what another had just set. Every write merges onto the cached copy instead.
window.hqPrefs = {
  get(){ try { return JSON.parse(localStorage.getItem('hq.prefs')) || {}; } catch { return {}; } },
  save(patch){
    const doc = { ...this.get(), ...patch };
    try { localStorage.setItem('hq.prefs', JSON.stringify(doc)); } catch {}
    if (window.store) store.save('prefs', doc);
    return doc;
  },
};

{
  const page = location.pathname.split('/').pop() || 'index.html';
  const prefs = () => { try { return JSON.parse(localStorage.getItem('hq.prefs')) || {}; } catch { return {}; } };
  const bandIds = () => { const n = prefs().nav; return Array.isArray(n) && n.length ? n : HQ_BAND; };
  const find = id => HQ_PAGES.find(p => p.id === id);

  function paintNav(){
    const nav = document.querySelector('.band nav[aria-label="Areas"]'); if (!nav) return;
    const band = bandIds().map(find).filter(Boolean);
    const rest = HQ_PAGES.filter(p => !band.includes(p));
    nav.innerHTML = band.map(p => `<a href="${p.file}"${p.file === page ? ' aria-current="page"' : ''}>${p.name}</a>`).join('')
      + (rest.length ? `<button type="button" class="more" id="hqmore" aria-expanded="false">More</button>` : '');
    const btn = nav.querySelector('#hqmore'); if (!btn) return;
    btn.addEventListener('click', e => { e.stopPropagation(); openMore(nav, band, rest); });
  }

  function openMore(nav, band, rest){
    let pop = nav.querySelector('.morepop');
    if (pop) { pop.remove(); nav.querySelector('#hqmore').setAttribute('aria-expanded', 'false'); return; }
    pop = document.createElement('div');
    pop.className = 'morepop';
    const inBand = new Set(band.map(p => p.id));
    pop.innerHTML = `<ul>${HQ_PAGES.map(p => `<li${p.file === page ? ' class="here"' : ''}>
        <a href="${p.file}">${p.name}</a>
        <button type="button" class="pin ${inBand.has(p.id) ? 'on' : ''}" data-pin="${p.id}"
          aria-pressed="${inBand.has(p.id)}" aria-label="${inBand.has(p.id) ? 'Take ' + p.name + ' out of the band' : 'Put ' + p.name + ' in the band'}">${inBand.has(p.id) ? 'in the band' : 'add'}</button>
      </li>`).join('')}</ul>`;
    nav.appendChild(pop);
    nav.querySelector('#hqmore').setAttribute('aria-expanded', 'true');
    pop.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-pin]'); if (!b) return;
      const id = b.dataset.pin, now = bandIds();
      const next = now.includes(id) ? now.filter(x => x !== id) : [...now, id];
      if (!next.length) return;                                   // the band is never left empty
      hqPrefs.save({ nav: next });                                // merged onto whatever else is in there
      paintNav();
      // the band under you has changed, but you may well want to move another: the list stays open
      const nav2 = document.querySelector('.band nav[aria-label="Areas"]');
      const band2 = bandIds().map(find).filter(Boolean);
      openMore(nav2, band2, HQ_PAGES.filter(x => !band2.includes(x)));
    });
    const shut = e => { if (!nav.contains(e.target)) { pop.remove(); const m = nav.querySelector('#hqmore'); if (m) m.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', shut); } };
    document.addEventListener('click', shut);
  }

  addEventListener('DOMContentLoaded', paintNav);
  // the saved arrangement arrives after the cached one; redraw only if it differs from what is on screen
  addEventListener('DOMContentLoaded', () => setTimeout(async () => {
    if (!window.store) return;
    const doc = await store.load('prefs', true).catch(() => null);
    if (doc && Array.isArray(doc.nav) && doc.nav.join() !== bandIds().join()) { try { localStorage.setItem('hq.prefs', JSON.stringify(doc)); } catch {} paintNav(); }
  }, 600));
}

// Removing something is one click and no warning, which is right — a confirmation on every small deletion is
// its own kind of tax. What makes that safe is being able to take it back: the caller hands over a function
// that puts things as they were, and this offers it for ten seconds.
let undoAt = null;
window.hqUndo = (what, undo) => {
  clearTimeout(undoAt);
  const old = document.querySelector('.hq-undo'); if (old) old.remove();
  const bar = document.createElement('div');
  bar.className = 'hq-undo';
  bar.innerHTML = '<span></span><button type="button">Undo</button>';
  bar.querySelector('span').textContent = `Removed ${what}.`;
  const go = () => { clearTimeout(undoAt); bar.remove(); };
  bar.querySelector('button').addEventListener('click', () => { undo(); go(); });
  document.body.appendChild(bar);
  undoAt = setTimeout(go, 10000);
};
// a copy deep enough to put back whatever was taken out of it
window.hqCopy = x => JSON.parse(JSON.stringify(x));

// How a chart is asked what a point is worth. A mouse hovers and the reading follows it. A finger has no
// hover: a tap pins the reading and it stays — tap the same place again, or anywhere off the chart, to put it
// away, and tap a different point to move it there. show(e) draws the reading, hide() clears it.
window.chartReading = (svg, show, hide) => {
  let pinned = false, at = 0;
  const near = e => Math.abs(e.clientX - at) < 26;
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { show(e); return; }
    if (pinned && near(e)) { pinned = false; hide(); return; }
    pinned = true; at = e.clientX; show(e);
  });
  svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || pinned) { if (pinned) at = e.clientX; show(e); } });
  svg.addEventListener('pointerup', () => { if (!pinned) hide(); });
  svg.addEventListener('pointercancel', () => { if (!pinned) hide(); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
  addEventListener('pointerdown', e => { if (pinned && !svg.contains(e.target)) { pinned = false; hide(); } }, true);
};

// what this copy is, in the corner, on every page
addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.hq-ver')) return;
  const v = document.createElement('span');
  v.className = 'hq-ver'; v.textContent = 'v' + HQ_VERSION; v.title = 'The version of HQ this page was built from';
  document.body.appendChild(v);
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});   // reminders, and the offline shell
addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('menubtn'), band = document.querySelector('.band');
  if (b && band) b.addEventListener('click', () => { band.classList.toggle('nav-open'); b.setAttribute('aria-expanded', band.classList.contains('nav-open')); });
});
