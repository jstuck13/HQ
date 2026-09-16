// The one place the pages ask what day it is, and how to write one down.
// Times are 12-hour with a dot (8.40 am). Dates read "Tuesday, 15 September 2026", "Tue 15", "15 Sep".
(function () {
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = d => addDays(d, -((d.getDay() + 6) % 7));                     // week starts Monday
  const time = d => `${d.getHours() % 12 || 12}.${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
  const hourLabel = h => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
  const dayName = d => DAYS[d.getDay()], dayShort = d => DAYS[d.getDay()].slice(0, 3);
  const monthName = d => MONTHS[d.getMonth()], monthShort = d => MONTHS[d.getMonth()].slice(0, 3);
  const long = d => `${dayName(d)}, ${d.getDate()} ${monthName(d)} ${d.getFullYear()}`;   // Tuesday, 15 September 2026
  const short = d => `${dayShort(d)} ${d.getDate()}`;                                        // Tue 15
  const dayMonth = d => `${d.getDate()} ${monthShort(d)}`;                                   // 15 Sep
  const dayMonthLong = d => `${d.getDate()} ${monthName(d)}`;                                // 15 September
  const weekdayDayMonth = d => `${dayName(d)} ${d.getDate()} ${monthShort(d)}`;               // Tuesday 15 Sep
  const month = d => `${monthName(d)} ${d.getFullYear()}`;                                   // September 2026
  const full = d => `${d.getDate()} ${monthShort(d)} ${d.getFullYear()}`;                    // 15 Sep 2026
  const greeting = d => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');
  const daysBetween = (a, b) => Math.round((fromISO(typeof b === 'string' ? b : iso(b)) - fromISO(typeof a === 'string' ? a : iso(a))) / 864e5);
  // '17', '17 Sep', 'Oct 3', '2026-10-03' → ISO; a bare day number means this month
  const parseDay = (t, now = new Date()) => {
    t = String(t).trim(); if (!t) return iso(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const m = /^\d{1,2}$/.exec(t); if (m) return iso(new Date(now.getFullYear(), now.getMonth(), +m[0], 12));
    const d = new Date(`${t} ${now.getFullYear()}`); if (!isNaN(d)) return iso(d);
    return iso(now);
  };
  // numbers count in: the first number inside each matched element ticks up from zero, once
  const countIn = (selector, ms = 500) => {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    document.querySelectorAll(selector).forEach(el => {
      if (el.dataset.counted) return; el.dataset.counted = '1';
      const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent)); if (!node) return;
      const m = /-?[\d,]*\d(\.\d+)?/.exec(node.textContent); if (!m) return;
      const text = node.textContent, target = parseFloat(m[0].replace(/,/g, '')), dec = m[1] ? m[1].length - 1 : 0, grouped = m[0].includes(',');
      if (!isFinite(target) || target === 0) return;
      const fmt = v => { const f = v.toFixed(dec); return grouped ? (+f).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : f; };
      const t0 = performance.now();
      const step = t => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); node.textContent = text.slice(0, m.index) + fmt(target * e) + text.slice(m.index + m[0].length); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };
  const now = new Date();
  window.clock = { now, today: iso(now), iso, fromISO, addDays, monday, time, hourLabel, dayName, dayShort, monthName, monthShort, long, short, dayMonth, dayMonthLong, weekdayDayMonth, month, full, greeting, daysBetween, parseDay, countIn };
  // lamplight: from eight in the evening until six the pages take a warmer, dimmer palette
  const lamp = () => { const h = new Date().getHours(), next = (h >= 20 || h < 6) ? 'evening' : '', root = document.documentElement;
    if (root.dataset.light !== undefined && root.dataset.light !== next) { root.classList.add('hq-fade'); setTimeout(() => root.classList.remove('hq-fade'), 2400); }   // a live flip crossfades
    root.dataset.light = next; };
  lamp(); setInterval(lamp, 60000);
  // motion, restrained: pages arrive, the now line breathes, a ticked line strikes through. All off under reduced motion.
  const motion = document.createElement('style');
  motion.textContent = `@media (prefers-reduced-motion:no-preference){
    @keyframes hq-arrive{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .band .mast{animation:hq-arrive .4s ease-out both}
    main>*{animation:hq-arrive .45s ease-out both}
    main>*:nth-child(2){animation-delay:.06s} main>*:nth-child(3){animation-delay:.12s} main>*:nth-child(n+4){animation-delay:.18s}
    @keyframes hq-breathe{0%,100%{opacity:1}50%{opacity:.65}}
    .now{animation:hq-breathe 4s ease-in-out infinite}
    @keyframes hq-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
    @keyframes hq-grow{from{transform:scaleY(0)}to{transform:none}}
    @keyframes hq-widen{from{transform:scaleX(0)}to{transform:none}}
    html:not([data-ready]) svg path.ln{stroke-dasharray:1;stroke-dashoffset:1;animation:hq-draw .8s ease-out .1s both}
    html:not([data-ready]) svg .bar-in,html:not([data-ready]) svg .bar-out{transform-box:fill-box;transform-origin:bottom;animation:hq-grow .5s ease-out both}
    html:not([data-ready]) svg .hbar{transform-box:fill-box;transform-origin:left;animation:hq-widen .5s ease-out both}
    html:not([data-ready]) .cats .bar i{animation:hq-widen .5s ease-out both;transform-origin:left}
    .hq-fade,.hq-fade *{transition:background-color 2s ease,color 2s ease,border-color 2s ease!important}
    @keyframes hq-strike{from{background-size:0 1px}to{background-size:100% 1px}}
    html[data-ready] .todo input:checked+label,html[data-ready] .pills input:checked+label{animation:hq-strike .3s ease-out both}
  }`;
  document.head.appendChild(motion);
  addEventListener('DOMContentLoaded', () => setTimeout(() => { document.documentElement.dataset.ready = '1'; }, 800));   // strikes animate only after the page has settled
  // the band's date line, on every page that has one
  addEventListener('DOMContentLoaded', () => { document.querySelectorAll('.band .date').forEach(el => { el.textContent = `${long(now)} · ${time(now)}`; }); });
})();
