// HQ — the few helpers every page writes the same way, and the band's menu button. Loaded after clock.js, before the page.
const F = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const h12 = h => { const hr=Math.floor(h), m=Math.round((h%1)*60); return `${hr%12||12}.${String(m).padStart(2,'0')} ${hr<12?'am':'pm'}`; };   // 8.5 → 8.30 am
const hrs = m => m>=60 ? (m%60 ? `${Math.floor(m/60)} h ${m%60}` : `${m/60} h`) : `${m} min`;                                            // 95 → 1 h 35
const $0 = n => (n<0?'−':'') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');                                                    // 2194.4 → $2,194
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});   // for reminders; it caches nothing
addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('menubtn'), band = document.querySelector('.band');
  if (b && band) b.addEventListener('click', () => { band.classList.toggle('nav-open'); b.setAttribute('aria-expanded', band.classList.contains('nav-open')); });
});
