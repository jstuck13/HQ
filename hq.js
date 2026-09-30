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
const HQ_VERSION = '4.7.0';

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
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});   // reminders, and the offline shell
addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('menubtn'), band = document.querySelector('.band');
  if (b && band) b.addEventListener('click', () => { band.classList.toggle('nav-open'); b.setAttribute('aria-expanded', band.classList.contains('nav-open')); });
});
