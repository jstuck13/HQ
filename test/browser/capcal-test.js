// The box on Today: what becomes an appointment, and — just as important — what must not.
setTimeout(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const F = id => document.getElementById(id);
  const doc = k => JSON.parse(localStorage.getItem('hq.' + k) || 'null');
  const today = clock.today;
  const type = async t => { F('t-text').value = t; F('addt').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await w(650); };
  const out = [];
  const entries = () => (doc('calendar') || { series: [] }).series.filter(s => s.source !== 'google');
  const todos = () => (doc('today.' + today) || { items: [] }).items;

  const shows = e => `${e.title} ${e.date} ${e.start}-${e.end}${e.cat !== 'cal' ? ' [' + e.cat + ']' : ''}`;

  // things that should become appointments
  for (const [text, want] of [
    ['Dentist 3–4 pm', 'a dash span'],
    ['Coffee with Sam 9 to 10.30 am', 'a "to" span'],
    ['Haircut Thursday at 2 pm', 'a named day'],
    ['Lab Tuesday 1-3 pm', 'a day and a span'],
    ['Physio tomorrow at 8.15 am for 45 min', 'tomorrow with a length'],
    ['Gym 5–6 pm', 'should find the Training category'],
  ]) {
    const n = entries().length;
    await type(text);
    const made = entries().length > n;
    out.push(`${want}: ${made ? shows(entries().slice(-1)[0]) : 'NOT MADE'}`);
  }

  // things that must stay what they were
  const before = { cal: entries().length, todo: todos().length };
  for (const text of ['Call the dentist by 3 pm', 'Laundry', 'Read 20 pages', 'Vitamins every day',
                      'Read pages 10 to 20', 'Run 5 to 10 km', 'Email 3 to 4 people', 'Order 2 to 3 weeks out']) await type(text);
  out.push(`left alone: calendar ${entries().length - before.cal} new (want 0), to-dos ${todos().length - before.todo} new`);

  const m0 = (doc('finances.' + today.slice(0, 7)) || { tx: [] }).tx.length;
  await type('12.40 lunch');
  await type('173.2');
  out.push(`money and weight still route: tx +${(doc('finances.' + today.slice(0, 7)) || { tx: [] }).tx.length - m0}, weight ${(doc('health').days[today] || {}).weight}`);

  out.push(`pushes to Google: ${(window.__sync || []).filter(x => x === 'calpush').length} times`);
  document.title = out.join(' | ');
}, 2600);
