// HQ — the few helpers every page writes the same way, and the band's menu button. Loaded after clock.js, before the page.
const F = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const h12 = h => { const hr=Math.floor(h), m=Math.round((h%1)*60); return `${hr%12||12}.${String(m).padStart(2,'0')} ${hr<12?'am':'pm'}`; };   // 8.5 → 8.30 am
const hrs = m => m>=60 ? (m%60 ? `${Math.floor(m/60)} h ${m%60}` : `${m/60} h`) : `${m} min`;                                            // 95 → 1 h 35
const $0 = n => (n<0?'−':'') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');                                                    // 2194.4 → $2,194
// the splash (hq.css) covers the page until its first documents have answered and drawn — store.js calls hqReveal — 4 s at the most
{ const t0 = Date.now(); let gone = false;
  window.hqReveal = () => { if (gone) return; gone = true; setTimeout(() => document.body.classList.add('hq-in'), Math.max(0, 350 - (Date.now() - t0))); };   // held 350 ms so it reads as a mark, not a flicker
  setTimeout(window.hqReveal, 4000); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});   // for reminders; it caches nothing
addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('menubtn'), band = document.querySelector('.band');
  if (b && band) b.addEventListener('click', () => { band.classList.toggle('nav-open'); b.setAttribute('aria-expanded', band.classList.contains('nav-open')); });
});
