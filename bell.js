// The bell: what has synced, when, and whether anything failed. One script, every page.
(function () {
  const SOURCES = { canvas: { name: 'Canvas', page: 'school.html', count: l => l.items != null ? `${l.items} items` : '' },
                    google: { name: 'Google Calendar', page: 'calendar.html', count: l => l.calendars != null ? `${l.calendars} ${l.calendars === 1 ? 'calendar' : 'calendars'}` : '' },
                    garmin: { name: 'Garmin', page: 'health.html', count: l => l.days != null ? `${l.days} days` : '' },
                    daily: { name: 'Nightly: word, quote, Publix ad, prices', page: 'groceries.html', count: l => [l.word ? `“${l.word}”` : '', l.bogos != null ? `${l.bogos} BOGOs` : '', l.priced != null ? `${l.priced} priced` : ''].filter(Boolean).join(' · ') },
                    bills: { name: 'Scheduled expenses', page: 'finances.html', count: l => l.rules != null ? `${l.rules} ${l.rules === 1 ? 'rule' : 'rules'}${l.posted ? ' · ' + l.posted + ' posted' : ''}` : '' },
                    notify: { name: 'Reminders', page: 'today.html', count: l => l.said ? `last: ${esc(l.said).slice(0, 60)}${l.said.length > 60 ? '…' : ''}` : l.quiet ? 'nothing to say' : '' },
                    backup: { name: 'Nightly backup', page: 'today.html', count: l => l.documents != null ? `${l.documents} documents` : '', extra: l => l.day ? `<a class="go dl" href="/api/sync/backup?day=${l.day}" download>Download</a>` : '' } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // three kinds of notice, nothing else: due today, a bill due today, pills not taken by nine in the evening
  // two kinds of notice above the syncs: today's timed to-dos (all of them, late ones marked), and what is due — school
  // items due today or overdue, a bill due today, pills not taken by nine in the evening
  let todoDoc = null;   // today's to-do document, kept so a tick from the bell can be saved
  const notices = async () => {
    const today = clock.today, ym = today.slice(0, 7), hour = new Date().getHours(), todos = [], due = [];
    const [school, fin, health, todo] = await Promise.all([store.load('school'), store.load('finances.' + ym), store.load('health'), store.load('today.' + today)].map(p => p.catch(() => null)));
    const nowH = new Date().getHours() + new Date().getMinutes() / 60, h12 = h => { const hr = Math.floor(h), m = Math.round((h % 1) * 60); return `${hr % 12 || 12}.${String(m).padStart(2, '0')} ${hr < 12 ? 'am' : 'pm'}`; };
    (todo && todo.items || []).forEach((i, k) => { if (!i.done && i.at != null) todos.push({ k, at: i.at, text: esc(i.text), when: i.at < nowH ? `was due by ${h12(i.at)}` : `by ${h12(i.at)}`, late: i.at < nowH, href: 'today.html' }); });
    todos.sort((a, b) => a.at - b.at); todoDoc = todo;
    for (const i of (school && school.items || []).filter(i => !i.done && i.due && i.due <= today)) due.push({ text: esc(i.title), when: i.due < today ? 'overdue' : 'due today', late: i.due < today, href: 'school.html' });
    if (fin) for (const c of (fin.cats || []).filter(c => c.due === new Date().getDate() && (c.bill || !(fin.tx || []).some(t => t.cat === c.id)))) due.push({ text: esc(c.bill || c.name), when: 'due today', href: 'finances.html' });
    if (health && hour >= 21) { const meds = health.meds || [], taken = (health.days && health.days[today] || {}).pills || [], left = meds.filter(m => !taken.includes(m.id)); if (left.length) due.push({ text: left.map(m => esc(m.name)).join(', '), when: 'not taken yet', late: true, href: 'health.html' }); }
    return { todos, due };
  };
  // reminders on this device: a push subscription, kept on the server, sent to by /api/sync/notify
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const pushState = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { can: false, why: /iPhone|iPad/.test(navigator.userAgent) && !navigator.standalone ? 'add HQ to the home screen first' : 'not supported in this browser' };
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    return { can: true, on: !!sub, sub, reg };
  };
  const pushOn = async () => {
    const info = await (await fetch('/api/push')).json(); if (!info.ready) throw new Error('keys not set');
    if ((await Notification.requestPermission()) !== 'granted') throw new Error('permission refused');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(info.key) });
    await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), label: navigator.userAgent.slice(0, 60) }) });
  };
  const pushOff = async () => { const { sub } = await pushState(); if (!sub) return; await fetch('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); };
  const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

  const style = document.createElement('style');
  style.textContent = `
    .bell{position:relative}
    .bell .dot{position:absolute;top:2px;right:2px;width:7px;height:7px;border-radius:50%;background:var(--ox);display:none}
    .bell.bad .dot{display:block}
    .bellpop{position:absolute;right:0;top:calc(100% + 10px);width:min(320px,calc(100vw - 40px));background:var(--card);color:var(--ink);border-radius:16px;box-shadow:var(--shadow);padding:16px 18px;z-index:20;text-align:left}
    .bellpop h4{font-family:var(--serif);font-weight:400;font-size:17px;margin:0 0 6px;padding-bottom:8px;border-bottom:1px solid var(--rule)}
    .bellpop li{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:9px 0;border-bottom:1px dotted var(--rule);font-size:13.5px}
    .bellpop li:last-child{border-bottom:0}
    .bellpop .n{font-family:var(--serif);font-size:15px}
    .bellpop .n a{color:inherit}
    .bellpop .s{grid-column:1;color:var(--ink-3);font-size:12.5px}
    .bellpop .s.bad{color:var(--ox)}
    .bellpop .go{grid-column:2;grid-row:1/3;align-self:center;font-size:12.5px;color:var(--ink-2);letter-spacing:.04em;border-bottom:1px solid transparent;white-space:nowrap}
    .bellpop .go:hover{border-color:currentColor;color:var(--ink)}
    .bellpop .go.dl{grid-column:2;grid-row:3;margin-top:2px}
    .bellpop .empty{padding:8px 0 2px;color:var(--ink-3);font-style:italic;font-family:var(--serif);font-size:14px}
    .bellpop ul.notices li{display:grid;grid-template-columns:1fr auto;gap:12px;padding:8px 0;border-bottom:1px dotted var(--rule);align-items:baseline}
    .bellpop ul.notices li:has(input){grid-template-columns:auto 1fr auto}
    .bellpop .notices input{appearance:none;width:15px;height:15px;border:1px solid var(--ink-2);margin:0;display:grid;place-items:center;cursor:pointer;background:var(--paper);border-radius:2px;align-self:center}
    .bellpop .notices input:checked{background:var(--band);border-color:var(--band)}
    .bellpop .notices input:checked::after{content:"";width:7px;height:4px;border:1.5px solid var(--band-ink);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}
    .bellpop .notices li.done .t{color:var(--ink-3);text-decoration:line-through}
    .bellpop .notices a{font-family:var(--serif);font-size:15px;display:contents}
    .bellpop .notices .w{font-size:12.5px;color:var(--ink-3);font-family:var(--sans);white-space:nowrap}
    .bellpop .notices .late .w{color:var(--ox)}
    .bellpop .notices .late .t::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ox);margin:0 8px 2px 0}
    .bellpop h4 ~ h4{margin-top:16px}
    .row .right{position:relative}`;
  document.head.appendChild(style);

  addEventListener('DOMContentLoaded', async () => {
    const bell = document.querySelector('.band .ib[aria-label="Notifications"]'); if (!bell || !window.store) return;
    bell.classList.add('bell'); bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    bell.setAttribute('aria-expanded', 'false');
    let pop = null, ledger = {}, notes = { todos: [], due: [] };
    const paint = () => { bell.classList.toggle('bad', notes.todos.some(n => n.late) || notes.due.length > 0 || Object.values(ledger).some(l => l && l.ok === false)); };   // the dot: something late, something due, or a failed sync
    const section = (title, list) => list.length ? `<h4>${title}</h4><ul class="notices">${list.map(n => `<li class="${n.late ? 'late' : ''}">${n.k != null ? `<input type="checkbox" aria-label="Done: ${n.text}" data-k="${n.k}">` : ''}<a href="${n.href}"><span class="t">${n.text}</span><span class="w">${n.when}</span></a></li>`).join('')}</ul>` : '';
    const render = () => {
      const rows = Object.entries(SOURCES).map(([k, src]) => {
        const l = ledger[k];
        const status = !l ? 'not connected' : l.ok ? `${ago(l.last)}${src.count(l) ? ' · ' + src.count(l) : ''}` : `failed ${ago(l.last)} · ${esc(l.error || '')}`;
        return `<li><span class="n"><a href="${src.page}">${src.name}</a></span><span class="s ${l && !l.ok ? 'bad' : ''}">${status}</span>${l ? `<button class="go" type="button" data-sync="${k}">${k === 'backup' ? 'Back up now' : 'Sync now'}</button>${src.extra && l.ok ? src.extra(l) : ''}` : k === 'backup' ? `<button class="go" type="button" data-sync="${k}">Back up now</button>` : `<a class="go" href="${src.page}">Set up</a>`}</li>`;
      });
      pop.innerHTML = `${section('To do', notes.todos)}${section('Due', notes.due)}<h4>Syncs</h4><ul>${rows.join('')}</ul><h4>This device</h4><ul><li id="pushrow"><span class="n">Reminders</span><span class="s">checking…</span></li></ul>`;
      pushState().then(st => {
        const li = pop.querySelector('#pushrow'); if (!li) return;
        li.innerHTML = `<span class="n">Reminders</span><span class="s">${st.can ? (st.on ? 'on: morning, midday and evening, when there is something to say' : 'off on this device') : st.why}</span>${st.can ? `<button class="go" type="button" id="pushtoggle">${st.on ? 'Turn off' : 'Turn on'}</button>` : ''}`;
        li.querySelector('#pushtoggle')?.addEventListener('click', async e => { e.target.textContent = '…'; try { await (st.on ? pushOff() : pushOn()); } catch (err) { li.querySelector('.s').textContent = err.message === 'keys not set' ? 'needs VAPID keys in Vercel' : err.message === 'permission refused' ? 'notifications are blocked for this site' : 'could not turn on'; li.querySelector('.s').classList.add('bad'); } render(); });
      });
      // a tick here is the same as a tick on Today: saved, and Today redraws if it is the page underneath
      pop.querySelectorAll('input[data-k]').forEach(c => c.addEventListener('change', async () => {
        if (!todoDoc) return; todoDoc.items[+c.dataset.k].done = c.checked; store.save('today.' + clock.today, todoDoc);
        if (window.onTodoChange) window.onTodoChange(todoDoc);
        c.closest('li').classList.add('done'); setTimeout(async () => { notes = await notices(); paint(); render(); }, 450);
      }));
      pop.querySelectorAll('[data-sync]').forEach(b => b.addEventListener('click', async () => {
        b.textContent = b.dataset.sync === 'backup' ? 'Backing up…' : 'Syncing…'; const r = await store.sync(b.dataset.sync); if (r) ledger[b.dataset.sync] = r; paint(); render();
        if (r && r.ok && location.pathname.endsWith(SOURCES[b.dataset.sync].page)) location.reload();
      }));
    };
    const open = async () => { if (!pop) { pop = document.createElement('div'); pop.className = 'bellpop'; bell.parentElement.appendChild(pop); } [ledger, notes] = await Promise.all([store.ledger(), notices()]); paint(); render(); pop.hidden = false; bell.setAttribute('aria-expanded', 'true'); };
    const close = () => { if (pop) pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); };
    bell.addEventListener('click', e => { e.stopPropagation(); (pop && !pop.hidden) ? close() : open(); });
    document.addEventListener('click', e => { if (pop && !pop.hidden && !pop.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    [ledger, notes] = await Promise.all([store.ledger(), notices()]); paint();      // the dot shows a notice or a failure without opening anything
  });
})();
