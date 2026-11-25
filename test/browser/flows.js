// Debug flows: do on each page what a person actually does — type into the forms, submit them,
// move between views — and report whether the document changed the way it should have.
// One object per page; the harness picks the one matching the page it is loaded into.
(() => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const F = id => document.getElementById(id);
  const doc = k => JSON.parse(localStorage.getItem('hq.' + k) || 'null');
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const submit = f => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const ym = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  const FLOWS = {
    today: async out => {
      const items = () => doc('today.' + today).items || [];
      const boxes = [...document.querySelectorAll('#todo input[type=checkbox]')];
      if (boxes.length) { const before = items().filter(i => i.done).length; boxes[0].click(); await w(400);
        out.push(`tick a to-do: ${before} → ${items().filter(i => i.done).length} done`); }
      else out.push('tick a to-do: NOT SAVED (no boxes on the list)');

      // The box is the one every page shares now, and its ids are addt / t-text. This flow still asked for
      // addtodo / td-text, so the guard skipped it and the step quietly tested nothing.
      const f = F('addt');
      if (!f) out.push('the box: NOT SAVED (no #addt)');
      else {
        set(F('t-text'), 'Debug plain item'); submit(f); await w(500);
        out.push('plain to-do: ' + (items().some(i => i.text === 'Debug plain item') ? 'saved' : 'NOT SAVED')
               + ' said "' + (F('saidt').hidden ? '(silent)' : F('saidt').textContent) + '"');

        set(F('t-text'), 'Debug deadline by friday'); submit(f); await w(500);
        const d = items().find(i => i.text === 'Debug deadline');
        out.push('deadline to-do: ' + (d ? 'saved due ' + d.due : 'NOT SAVED')
               + ' chips "' + ([...document.querySelectorAll('#todo .from')].map(e => e.textContent).join('/') || 'none') + '"');

        set(F('t-text'), '4.75 debug coffee'); submit(f); await w(500);
        out.push('money: ' + (((doc('finances.' + ym) || {}).tx || []).some(t => +t.amt === 4.75) ? 'saved' : 'NOT SAVED'));
      }

      // the page's own shape: hide a block, send it across, and see whether it is remembered
      const arr = F('arrpage');
      if (!arr) out.push('arrange: NOT SAVED (no button)');
      else {
        arr.click(); await w(300);
        const rows = [...document.querySelectorAll('#pgedit .arrange li')];
        out.push('arrange: ' + rows.length + ' blocks listed');
        // the panel redraws itself after every change, so each row is looked up again rather than held on to
        const row = id => document.querySelector(`#pgedit .arrange li[data-id="${id}"]`);
        if (row('report')) {
          row('report').querySelector('input').click(); await w(400);
          out.push('hide the report: ' + ((((doc('prefs') || {}).today || {}).hidden || []).includes('report') ? 'remembered' : 'NOT SAVED')
                 + ' gone from the page: ' + (document.querySelector('[data-block=report]').hidden ? 'yes' : 'NO'));
          row('report').querySelector('input').click(); await w(400);   // back on, so the move is visible
          const side = row('report').querySelector('[data-side]');
          out.push('side button says "' + side.textContent + '"');
          side.click(); await w(400);
          out.push('send it across: ' + JSON.stringify(((doc('prefs') || {}).today || {}).col || {})
                 + ' now in ' + (document.querySelector('#colb [data-block=report]') ? 'the right column' : document.querySelector('#cola [data-block=report]') ? 'the left column' : 'NEITHER'));
          row('report').querySelector('[data-up]')?.click(); await w(400);
          out.push('move it up: order ' + JSON.stringify(((doc('prefs') || {}).today || {}).order || []));
        }
      }
      out.push('finances row: ' + (([...document.querySelectorAll('#affairs li')].find(l => /Finances/.test(l.textContent)) || {}).innerText || 'none').replace(/\s+/g, ' '));
    },

    list: async out => {
      const rows = () => [...document.querySelectorAll('#sheet li.row')];
      out.push('sheet: ' + rows().length + ' things, count "' + F('count').textContent + '"');
      if (!rows().length) { out.push('sheet: NOT SAVED (nothing read)'); return; }

      rows()[0].click(); await w(400);
      const card = document.querySelector('#sheet li.more');
      out.push('open a line: ' + (card ? card.querySelector('.big').textContent.replace(/\s+/g, ' ').slice(0, 54) : 'NO CARD'));
      rows()[0].click(); await w(300);

      const box = document.querySelector('#sheet li.row input[type=checkbox]');
      if (!box) out.push('tick here: nothing is on today’s list to tick');
      else { const was = (doc('today.' + today).items || []).filter(i => i.done).length;
        box.click(); await w(500);
        out.push('tick here: ' + was + ' → ' + (doc('today.' + today).items || []).filter(i => i.done).length + ' done in today’s document'); }

      const f = F('addt');
      if (!f) out.push('the box: NOT SAVED (no #addt)');
      else if (F('t-text').disabled) out.push('the box: NOT SAVED (still disabled after load)');
      else { set(F('t-text'), 'Debug list item by sunday'); submit(f); await w(800);
        const it = (doc('today.' + today).items || []).find(i => i.text === 'Debug list item');
        out.push('capture here: ' + (it ? 'saved due ' + it.due : 'NOT SAVED') + ', sheet now ' + rows().length); }

      const n = rows().length, x = document.querySelector('#sheet li.row .x');
      if (x) { x.click(); await w(600);
        out.push('delete: ' + n + ' → ' + rows().length);
        const undo = document.querySelector('.hq-undo button');
        if (undo) { undo.click(); await w(600); out.push('undo: back to ' + rows().length); }
        else out.push('undo: no button offered'); }

      set(F('q'), 'zzzznothing'); await w(300);
      out.push('search for nothing: "' + ((document.querySelector('#sheet .empty') || {}).textContent || 'NO EMPTY LINE') + '"');
      set(F('q'), ''); await w(300);
      F('standing').click(); await w(300);
      out.push('only standing: ' + rows().length + ' things');
      F('standing').click(); await w(200);
    },
    calendar: async out => {
      F('monthh').click(); await w(300);
      out.push('month view: ' + document.querySelectorAll('#mgrid .mday').length + ' days, arrive:' + F('mgrid').classList.contains('arrive'));
      F('monthh').click(); await w(300);
      out.push('back to week: ' + (!F('weekview').hidden));
      const before = (doc('calendar').series || []).length;
      if (F('addopen')) { F('addopen').click(); await w(150); }
      set(F('a-title'), 'Debug entry'); set(F('a-day'), '25 Sep'); set(F('a-start'), '3.00 pm'); set(F('a-end'), '4.00 pm');
      submit(F('add')); await w(400);
      out.push(`add an entry: ${before} → ${(doc('calendar').series || []).length}`);
      if (F('planbtn')) { F('planbtn').click(); await w(400); out.push('plan the week: ' + document.querySelectorAll('.gap').length + ' free stretches'); }
    },
    finances: async out => {
      const n0 = (doc('finances.' + ym).tx || []).length;
      set(F('x-what'), 'Debug purchase'); set(F('x-amt'), '12.34'); submit(F('addout')); await w(400);
      const d = doc('finances.' + ym);
      out.push(`log an expense: ${n0} → ${(d.tx || []).length}` + ((d.tx || []).some(t => t.what === 'Debug purchase') ? '' : ' NOT SAVED'));
      const more = F('more'); if (more) { more.click(); await w(300); out.push('show every one: ' + document.querySelectorAll('#outl li').length + ' rows, box ' + Math.round(F('outl').getBoundingClientRect().height) + '/' + F('outl').scrollHeight); }
      const bar = document.querySelector('#ive path[data-t]');
      if (bar) { const r = bar.getBoundingClientRect(); bar.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: r.left + r.width / 2, clientY: r.top + 3 })); await w(150);
        const tp = document.querySelector('#ive .tip');
        out.push('bar hover: ' + (tp.textContent ? '"' + tp.textContent + '" opacity ' + tp.style.opacity : 'NOT SAVED (tip stayed empty)')); }
      const i0 = (doc('finances.' + ym).income || []).length;
      set(F('in-src'), 'Debug pay'); set(F('in-amt'), '100'); submit(F('addin')); await w(400);
      out.push(`log income: ${i0} → ${(doc('finances.' + ym).income || []).length}`);
    },
    library: async out => {
      const b = doc('library').books.find(x => x.shelf === 'reading');
      const pin = document.querySelector('.prog input');
      if (b && pin) { set(pin, String((b.page || 0) + 7)); await w(600);
        out.push(`page moved: ${b.page} → ${doc('library').books.find(x => x.id === b.id).page}`); }
      const n0 = (b && b.notes || []).length;
      if (F('note')) { set(F('note'), 'A debug note'); submit(F('write')); await w(400);
        out.push(`keep a note: ${n0} → ${(doc('library').books.find(x => x.id === b.id).notes || []).length}`); }
      out.push('shelves: ' + [...document.querySelectorAll('.wall')].map(el => el.id + ':' + el.children.length).join(', '));
    },
    school: async out => {
      const boxes = [...document.querySelectorAll('#due input[type=checkbox]')];
      if (boxes.length) { const d0 = doc('school').items.filter(i => i.done).length; boxes[0].click(); await w(400);
        out.push(`tick an assignment: ${d0} → ${doc('school').items.filter(i => i.done).length} done`); }
      const s0 = (doc('school').sessions || []).length;
      set(F('s-min'), '35'); submit(F('addsess')); await w(400);
      out.push(`log a session: ${s0} → ${(doc('school').sessions || []).length}`);
      out.push('due box: ' + Math.round(F('due').getBoundingClientRect().height) + '/' + F('due').scrollHeight + ' · study next: ' + (document.querySelector('.next h3, .next .t, #nextn') || {}).textContent);
    },
    health: async out => {
      set(F('weight'), '173.4'); await w(500);
      out.push('log weight: ' + ((doc('health').days[today] || {}).weight || 'NOT SAVED'));
      const pills = [...document.querySelectorAll('#pills input[type=checkbox]')];
      if (pills.length) { pills[0].click(); await w(400); out.push('tick a supplement: ' + ((doc('health').days[today] || {}).pills || []).length + ' ticked'); }
      const r = document.querySelector('.range button:not(.on)'); if (r) { r.click(); await w(400); out.push('range toggle: clicked "' + r.textContent + '", stored ' + (localStorage.getItem('hq.health.range') || 'NOTHING')); }
      out.push('heading: ' + (document.querySelector('h2 + ul.pills') ? 'pills list present' : '') + ' ' + [...document.querySelectorAll('h2')].map(h => h.firstChild.textContent.trim()).join('/'));
    },
    review: async out => {
      out.push('portrait this week: ' + document.querySelectorAll('.prow').length + ' rows · from the watch: ' + document.querySelectorAll('.prow .ph i.sleep:not(.est)').length + ' · guessed: ' + document.querySelectorAll('.prow .ph i.est').length + ' · busy: ' + document.querySelectorAll('.prow .ph i.busy').length);
      const first = F('wk').textContent.slice(0, 40);
      document.querySelector('.wknav button, .nav button')?.click(); await w(900);
      out.push('paged a week: ' + (F('wk').textContent.slice(0, 40) !== first ? 'changed' : 'SAME') + ' · portrait redrew: ' + document.querySelectorAll('.prow').length + ' rows');
    },
    groceries: async out => {
      const n0 = (doc('groceries').list || []).length;
      set(F('l-text'), 'Debug bananas'); submit(F('addl')); await w(400);
      out.push(`add to the list: ${n0} → ${(doc('groceries').list || []).length}`);
      const box = [...document.querySelectorAll('#list input[type=checkbox]')][0];
      if (box) { box.click(); await w(400); out.push('tick it: ' + (doc('groceries').list || []).filter(l => l.done).length + ' ticked'); }
      const seg = document.querySelector('.seg button:not(.on)'); if (seg) { seg.click(); await w(300); out.push('deal filter: ' + seg.textContent + ' → ' + document.querySelectorAll('.bogo').length + ' items'); }
      out.push('price book: ' + document.querySelectorAll('#book li').length + ' rows, box ' + Math.round(F('book').getBoundingClientRect().height) + '/' + F('book').scrollHeight);
    },
    investments: async out => {
      F('pastewrap').open = true;
      F('pastebox').value = ['Account Number\tAccount Name\tSymbol\tDescription\tQuantity\tLast Price\tCurrent Value\tType',
                             'Z1\tIndividual\tSPAXX**\tHELD IN MONEY MARKET\t\t\t$514.49\tCash',
                             'Z1\tIndividual\tVOO\tVANGUARD S&P 500 ETF\t1.075\t$709.16\t$762.35\tCash'].join('\n');
      F('readpaste').click(); await w(200);
      out.push('paste read: ' + F('pastenote').textContent + ' · rows ' + document.querySelectorAll('#preview .pv li').length);
      F('applypaste').click(); await w(400);
      const h = doc('investments').holdings;
      out.push('applied: ' + h.map(x => x.ticker + ' ' + x.shares).join(', '));
      const cat = document.querySelector('#cats input[type=checkbox]'); if (cat) { cat.click(); await w(300); out.push('contribution category: ' + (doc('investments').contribCats || []).length + ' ticked'); }
      set(F('baseline'), '1200'); await w(400);
      out.push('baseline: ' + doc('investments').baseline + ' · ring segments: ' + document.querySelectorAll('#ring circle').length);
    },
    study: async out => {
      const first = document.querySelector('.stage .text').textContent.slice(0, 30);
      F('next').click(); await w(350);
      out.push('turn: ' + (document.querySelector('.stage .text').textContent.slice(0, 30) !== first ? 'moved on' : 'STUCK') + ' · class ' + F('stage').className);
      const a = F('answer'); if (a) { set(a, 'A debug answer'); await w(500); }
      F('back').click(); await w(350); F('next').click(); await w(350);
      out.push('answer survives the turn: ' + (F('answer') && F('answer').value === 'A debug answer' ? 'yes' : 'NO'));
      F('next').click(); await w(350); F('next').click(); await w(350);
      if (F('line')) { set(F('line'), 'A debug line'); F('keep').click(); await w(500);
        out.push('kept: ' + (doc('study').notes || []).length + ' lines · day done: ' + !!(doc('study').days[today] || {}).done); }
      out.push('look back: ' + document.querySelectorAll('#lbcards li').length + ' cards, tabs ' + document.querySelectorAll('#lbtabs button').length);
    },
  };

  const page = (location.pathname.split('/').pop() || '').replace(/^[a-z0-9]{1,6}-/, '').replace('.html', '');
  const flow = FLOWS[page];
  window.addEventListener('load', async () => {
    await w(2400);
    const out = [];
    try { if (flow) await flow(out); else out.push('no flow for ' + page); }
    catch (e) { out.push('THREW: ' + e.message); }
    if (window.__errs && window.__errs.length) out.push('ERRS: ' + window.__errs.join(' ~ '));
    document.title = out.join(' | ');
  });
})();
