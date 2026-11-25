// Today's one box: does it put each thing where it belongs, and do standing to-dos come back?
setTimeout(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const F = id => document.getElementById(id);
  const doc = k => JSON.parse(localStorage.getItem('hq.' + k) || 'null');
  const today = clock.today, ym = today.slice(0, 7);
  const type = async t => { F('t-text').value = t; F('addt').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await w(700); };
  const out = [];

  const tx0 = (doc('finances.' + ym) || { tx: [] }).tx.length;
  await type('12.40 lunch');
  const tx = (doc('finances.' + ym) || { tx: [] }).tx;
  out.push(`money: ${tx0}→${tx.length} · ${JSON.stringify(tx[tx.length - 1] && { what: tx[tx.length - 1].what, amt: tx[tx.length - 1].amt, cat: tx[tx.length - 1].cat })} · said "${F('saidt').textContent}"`);

  await type('$56.30 Weekly groceries');
  const tx2 = (doc('finances.' + ym) || { tx: [] }).tx;
  out.push(`category learned: ${JSON.stringify({ what: tx2[tx2.length - 1].what, cat: tx2[tx2.length - 1].cat })}`);

  await type('173.2');
  out.push(`weight: ${(doc('health').days[today] || {}).weight} · said "${F('saidt').textContent}"`);

  const n0 = doc('today.' + today).items.length;
  await type('Call the plumber by 4 pm');
  const last = doc('today.' + today).items.slice(-1)[0];
  out.push(`to-do: ${n0}→${doc('today.' + today).items.length} · ${JSON.stringify({ text: last.text, at: last.at })}`);

  await type('Take the bins out every Monday');
  const rules = (doc('todo.rules') || { rules: [] }).rules;
  out.push(`rule kept: ${rules.length} · ${JSON.stringify(rules[0] && { text: rules[0].text, rep: rules[0].rep })} · said "${F('saidt').textContent}"`);
  out.push(`listed: ${document.querySelectorAll('#reps li').length} · on today: ${doc('today.' + today).items.filter(i => i.rule).length}`);

  await type('Vitamins every day');
  await w(300);
  const items = doc('today.' + today).items;
  out.push(`daily posted today: ${items.some(i => i.text === 'Vitamins')} · mark shown: ${document.querySelectorAll('#todo .rp').length}`);

  // stopping a standing item takes today's copy with it
  const stop = document.querySelector('#reps [data-stop]');
  stop.click(); await w(600);
  out.push(`stopped: rules ${(doc('todo.rules') || { rules: [] }).rules.length} · items with a rule ${doc('today.' + today).items.filter(i => i.rule).length}`);

  // things that must NOT be read as money or weight
  const before = (doc('finances.' + ym) || { tx: [] }).tx.length;
  await type('Call 3 people');
  await type('Read 20 pages');
  out.push(`not money: ${(doc('finances.' + ym) || { tx: [] }).tx.length === before ? 'right' : 'WRONGLY LOGGED'} · weight untouched: ${(doc('health').days[today] || {}).weight === '173.2'}`);

  document.title = out.join(' | ');
}, 2600);
