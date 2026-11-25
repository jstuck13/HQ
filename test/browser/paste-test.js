// Investments: does a pasted positions export land the right share counts?
// Run inside a test copy of the page; findings go into document.title for a headless dump to read.
setTimeout(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const F = id => document.getElementById(id);
  const out = [];
  const shares = t => { const h = (JSON.parse(localStorage.getItem('hq.investments')) || {}).holdings.find(x => x.ticker === t); return h ? h.shares : null; };

  // a Fidelity Positions download: quoted money, ** on the money market, a pending row and the disclaimer at the end
  const csv = [
    'Account Number,Account Name,Symbol,Description,Quantity,Last Price,Current Value,Cost Basis Total,Type',
    'X111,Brokerage,SPAXX**,FIDELITY GOVERNMENT MONEY MARKET,"1,004.55",$1.00,"$1,004.55","$1,004.55",Cash',
    'X111,Brokerage,VOO,VANGUARD S&P 500 ETF,2.418,$709.16,"$1,714.75","$1,500.00",Cash',
    'X111,Brokerage,FXAIX,FIDELITY 500 INDEX FUND,6.001,$205.40,"$1,232.61","$1,100.00",Cash',
    'X111,Brokerage,Pending Activity,,,,$0.00,,',
    '',
    '"Brokerage services are provided by Fidelity Brokerage Services LLC."',
  ].join('\n');

  F('pastewrap').open = true;
  F('pastebox').value = csv;
  F('readpaste').click(); await w(120);
  out.push('note:' + F('pastenote').textContent);
  out.push('previewRows:' + document.querySelectorAll('#preview .pv li').length);
  out.push('newMarked:' + document.querySelectorAll('#preview .pv .now.add').length);
  out.push('gone:' + document.querySelectorAll('#preview .pv .gone').length);
  out.push('costBox:' + !!F('usecost'));

  const before = { SPAXX: shares('SPAXX'), VOO: shares('VOO') };
  if (F('usecost')) F('usecost').checked = true;
  F('applypaste').click(); await w(300);
  out.push(`SPAXX ${before.SPAXX}->${shares('SPAXX')}`);
  out.push(`VOO ${before.VOO}->${shares('VOO')}`);
  out.push('FXAIX added:' + shares('FXAIX'));
  out.push('baseline:' + (JSON.parse(localStorage.getItem('hq.investments')) || {}).baseline);
  out.push('boxCleared:' + (F('pastebox').value === ''));
  out.push('worth:' + F('worth').textContent);

  // rubbish in: nothing should change
  const snapshot = localStorage.getItem('hq.investments');
  F('pastewrap').open = true; F('pastebox').value = 'hello, this is not a positions file';
  F('readpaste').click(); await w(120);
  out.push('junk:' + F('pastenote').textContent.slice(0, 22) + ' | unchanged:' + (localStorage.getItem('hq.investments') === snapshot));

  document.title = out.join(' | ');
}, 2200);
