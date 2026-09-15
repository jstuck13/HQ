// The one place the pages ask what day it is. Everything shows 12-hour time with a dot (8.40 am).
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = d => addDays(d, -((d.getDay() + 6) % 7));                     // week starts Monday
  const time = d => `${d.getHours() % 12 || 12}.${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
  const hourLabel = h => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
  const long = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const short = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  const dayMonth = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const month = d => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const greeting = d => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 18 ? 'Good afternoon' : 'Good evening');
  const daysBetween = (a, b) => Math.round((fromISO(typeof b === 'string' ? b : iso(b)) - fromISO(typeof a === 'string' ? a : iso(a))) / 864e5);
  // '17', '17 Sep', 'Oct 3', '3/10' → ISO; a bare day number means this month (or next, if it has passed)
  const parseDay = (t, now = new Date()) => {
    t = String(t).trim(); if (!t) return iso(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(`${t} ${now.getFullYear()}`); if (!isNaN(d)) return iso(d);
    const m = /^\d{1,2}$/.exec(t); if (m) { const x = new Date(now.getFullYear(), now.getMonth(), +m[0], 12); return iso(x); }
    return iso(now);
  };
  const now = new Date();
  window.clock = { now, iso, fromISO, addDays, monday, time, hourLabel, long, short, dayMonth, month, greeting, daysBetween, parseDay, today: iso(now) };
  // the band's date line, on every page that has one
  addEventListener('DOMContentLoaded', () => { document.querySelectorAll('.band .date').forEach(el => { el.textContent = `${long(now)} · ${time(now)}`; }); });
})();
