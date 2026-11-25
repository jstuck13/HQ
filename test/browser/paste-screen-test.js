// Investments: the Positions page copied off the screen, where the core money market has no quantity.
setTimeout(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const F = id => document.getElementById(id);
  const out = [];
  const inv = () => JSON.parse(localStorage.getItem('hq.investments')) || {};
  const shares = t => { const h = inv().holdings.find(x => x.ticker === t); return h ? h.shares : null; };

  // tab separated, as a browser copy gives it; SPAXX shows "Held in money market" where the quantity would be
  const rows = [
    ['Account Number', 'Account Name', 'Symbol', 'Description', 'Quantity', 'Last Price', 'Current Value', 'Percent Of Account', 'Type'],
    ['Z54230468', 'Individual', 'SPAXX**', 'HELD IN MONEY MARKET', '', '', '$514.49', '40.08%', 'Cash'],
    ['Z54230468', 'Individual', 'VOO', 'VANGUARD S&P 500 ETF', '1.075', '$709.16', '$762.35', '59.92%', 'Cash'],
  ];
  F('pastewrap').open = true;
  F('pastebox').value = rows.map(r => r.join('\t')).join('\n');
  F('readpaste').click(); await w(150);
  out.push('note:' + F('pastenote').textContent);
  out.push('rows:' + document.querySelectorAll('#preview .pv li').length + ' gone:' + document.querySelectorAll('#preview .pv .gone').length);
  const before = shares('SPAXX');
  F('applypaste').click(); await w(300);
  out.push(`SPAXX ${before} -> ${shares('SPAXX')} (want 514.49)`);
  out.push(`VOO -> ${shares('VOO')}`);

  // the same thing pasted as runs of spaces rather than tabs
  const spaced = rows.map(r => r.join('    ')).join('\n');
  F('pastewrap').open = true; F('pastebox').value = spaced;
  F('readpaste').click(); await w(150);
  out.push('spaced:' + F('pastenote').textContent.slice(0, 20));

  // a holding with no price and no quantity must not be guessed at
  F('pastebox').value = [
    ['Account Number', 'Account Name', 'Symbol', 'Description', 'Quantity', 'Current Value', 'Type'].join('\t'),
    ['Z1', 'Individual', 'NEWCO', 'SOMETHING NEW', '', '$900.00', 'Cash'].join('\t'),
  ].join('\n');
  F('readpaste').click(); await w(150);
  out.push('noprice shown:' + /no price yet/.test(F('preview').textContent) + ' warned:' + /run Prices/.test(F('preview').textContent));
  const snap = localStorage.getItem('hq.investments');
  F('applypaste').click(); await w(250);
  out.push('noprice left alone:' + (localStorage.getItem('hq.investments') === snap));

  document.title = out.join(' | ');
}, 2200);
