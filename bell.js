// The bell: what has synced, when, and whether anything failed. One script, every page.
(function () {
  const SOURCES = { canvas: { brings: 'courses, assignments and tests', when: 'once a day', name: 'Canvas', page: 'school.html', count: l => l.items != null ? `${l.items} items` : '' },
                    google: { brings: 'events from every calendar you have shared', when: 'once a day', name: 'Google Calendar', page: 'calendar.html', count: l => l.calendars != null ? `${l.calendars} ${l.calendars === 1 ? 'calendar' : 'calendars'}` : '' },
                    garmin: { brings: 'sleep, resting heart rate, weight and steps', when: 'once a day', name: 'Garmin', page: 'health.html', count: l => l.days != null ? `${l.days} days` : '' },
                    daily: { brings: 'the word, the quote, the Publix ad and prices', when: 'once a day', name: 'Nightly: word, quote, Publix ad, prices', page: 'groceries.html', count: l => [l.word ? `“${l.word}”` : '', l.bogos != null ? `${l.bogos} BOGOs` : '', l.priced != null ? `${l.priced} priced` : ''].filter(Boolean).join(' · ') },
                    bills: { brings: 'the expenses that repeat, posted when due', when: 'once a day', name: 'Scheduled expenses', page: 'finances.html', count: l => l.rules != null ? `${l.rules} ${l.rules === 1 ? 'rule' : 'rules'}${l.posted ? ' · ' + l.posted + ' posted' : ''}` : '' },
                    notify: { brings: 'the reminders the phone is sent', when: 'three times a day', name: 'Reminders', page: 'today.html', count: l => l.said ? `last: ${esc(l.said).slice(0, 60)}${l.said.length > 60 ? '…' : ''}` : l.quiet ? 'nothing to say' : '' },
                    backup: { brings: 'every document, kept for thirty days', when: 'once a day', name: 'Nightly backup', page: 'today.html', count: l => l.documents != null ? `${l.documents} documents` : '', extra: l => l.day ? `<a class="go dl" href="/api/sync/backup?day=${l.day}" download>Download</a><a class="go dl" href="restore.html">Restore</a>` : '<a class="go dl" href="restore.html">Restore</a>' } };
  window.hqSources = SOURCES;   // the colophon reads the same list, so these names live in one place only
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // three kinds of notice, nothing else: due today, a bill due today, supplements not taken by nine in the evening
  // two kinds of notice above the syncs: today's timed to-dos (all of them, late ones marked), and what is due — school
  // items due today or overdue, a bill due today, supplements not taken by nine in the evening
  let todoDoc = null;   // today's to-do document, kept so a tick from the bell can be saved
  const notices = async () => {
    const today = clock.today, ym = today.slice(0, 7), hour = new Date().getHours(), todos = [], due = [];
    const [school, fin, health, todo] = await Promise.all([store.load('school', true), store.load('finances.' + ym, true), store.load('health', true), store.load('today.' + today, true)].map(p => p.catch(() => null)));
    const nowH = new Date().getHours() + new Date().getMinutes() / 60, h12 = h => { const hr = Math.floor(h), m = Math.round((h % 1) * 60); return `${hr % 12 || 12}.${String(m).padStart(2, '0')} ${hr < 12 ? 'am' : 'pm'}`; };
    (todo && todo.items || []).forEach((i, k) => { if (!i.done && i.at != null) todos.push({ k, at: i.at, text: esc(i.text), when: i.at < nowH ? `was due by ${h12(i.at)}` : `by ${h12(i.at)}`, late: i.at < nowH, href: 'today.html' }); });
    todos.sort((a, b) => a.at - b.at); todoDoc = todo;
    for (const i of (school && school.items || []).filter(i => toDo(i) && i.due && i.due <= today)) due.push({ text: esc(i.title), when: i.due < today ? 'overdue' : 'due today', late: i.due < today, href: 'school.html' });
    if (fin) for (const c of (fin.cats || []).filter(c => c.due === new Date().getDate() && (c.bill || !(fin.tx || []).some(t => t.cat === c.id)))) due.push({ text: esc(c.bill || c.name), when: 'due today', href: 'finances.html' });
    if (health && hour >= 21) { const meds = health.meds || [], taken = (health.days && health.days[today] || {}).pills || [], left = meds.filter(m => !taken.includes(m.id)); if (left.length) due.push({ text: left.map(m => esc(m.name)).join(', '), when: 'not taken yet', late: true, href: 'health.html' }); }
    return { todos, due, noticed: await noticing({ school, fin, health, todo, today }) };
  };

  // Things HQ already knows and has never said. Each one is named, can be switched off, and carries the number
  // of days that makes it worth saying — my figures are a starting point, not a judgement about your weeks.
  // Nothing here guesses: every rule is a plain fact about a document.
  const days = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);

  // A page that threw is not a fact about a document — it is a fact about this browser, like whether reminders
  // are switched on — so it belongs under "This device". store.js writes them down (hq!oops); the bell is where
  // they can be found afterwards, since the notice on the page itself only lasts until it is dismissed.
  // One row per page, keeping the FIRST message, which is the one that explains the rest.
  const faults = () => {
    let l = []; try { l = (window.hqOops && window.hqOops.list()) || []; } catch {}
    const by = new Map();
    for (const x of l) {
      if (!x || !x.what) continue;
      const g = by.get(x.page) || { page: x.page, what: x.what, n: 0, at: x.at };
      g.n += x.n || 1; if (!g.at || x.at > g.at) g.at = x.at;
      by.set(x.page, g);
    }
    return [...by.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
  };
  const faultRow = f => {
    const where = f.page === 'index' ? 'The welcome page' : f.page;
    const what = f.what.length > 70 ? f.what.slice(0, 70) + '…' : f.what;
    return `<li class="oops"><span class="n">${esc(where)} did not work</span>`
      + `<span class="s">${esc(what)}${f.n > 1 ? ` · ${f.n} times` : ''}</span></li>`;
  };
  const NOTICES = [
    { id: 'book', name: 'A book that has not moved', unit: 'days', days: 14,
      find: ({ lib, today }, n) => (lib && lib.books || []).filter(b => b.shelf === 'reading').map(b => {
        const log = Object.keys(b.log || {}).sort(), last = log[log.length - 1];
        if (!last) return null;
        const d = days(last, today); if (d < n) return null;
        return { text: esc(b.title), when: `at page ${b.page || 0} for ${d} days`, href: 'library.html' };
      }).filter(Boolean) },

    { id: 'exam', name: 'An exam with nothing studied', unit: 'days ahead', days: 4,
      find: ({ school, today }, n) => (school && school.items || []).filter(i => toDo(i) && i.due >= today).map(i => {
        const d = days(today, i.due); if (d > n) return null;
        if (!/\b(final|midterm|exam|test|quiz)\b/i.test(i.title) && i.type !== 'test') return null;
        const mins = (school.sessions || []).filter(x => x.course === i.course && days(x.date, today) >= 0 && days(x.date, today) < 7).reduce((m, x) => m + (+x.min || 0), 0);
        if (mins) return null;
        return { text: esc(i.title), when: d === 0 ? 'today, nothing studied' : `in ${d} ${d === 1 ? 'day' : 'days'}, nothing studied`, late: d <= 1, href: 'school.html' };
      }).filter(Boolean) },

    { id: 'carried', name: 'A to-do carried over', unit: 'days', days: 4,
      find: ({ todo, today }, n) => (todo && todo.items || []).filter(i => !i.done && i.from).map(i => {
        const d = days(i.from, today); if (d < n) return null;
        return { text: esc(i.text), when: `carried over ${d} days`, href: 'today.html' };
      }).filter(Boolean) },

    { id: 'prices', name: 'Prices that stopped arriving', unit: 'days', days: 4,
      find: ({ inv }, n) => {
        const ats = Object.values(inv && inv.prices || {}).map(x => x && x.at).filter(Boolean).sort();
        if (!(inv && inv.holdings || []).length || !ats.length) return [];
        const d = Math.round((Date.now() - Date.parse(ats[ats.length - 1])) / 86400000);
        return d >= n ? [{ text: 'Prices', when: `last fetched ${d} days ago`, href: 'investments.html' }] : [];
      } },

    { id: 'letgo', name: 'A standing item you keep letting go', unit: 'days running', days: 4,
      find: ({ rules }, n) => (rules && rules.rules || []).map(r => {
        const e = Object.entries(r.log || {}).sort(); if(!e.length) return null;
        let run = 0; for(let i = e.length - 1; i >= 0 && !e[i][1]; i--) run++;
        if(run < n) return null;
        return { text: esc(r.text), when: `let go ${run} days running`, href: 'today.html' };
      }).filter(Boolean) },

    { id: 'feel', name: 'Days left unrated', unit: 'days', days: 5,
      find: ({ health, today }, n) => {
        const rated = Object.entries(health && health.days || {}).filter(([, r]) => r.energy != null || r.mood != null).map(([d]) => d).sort();
        const last = rated[rated.length - 1];
        return last && days(last, today) >= n ? [{ text: 'How the days have felt', when: `not rated for ${days(last, today)} days`, href: 'health.html' }] : [];
      } },
  ];

  // what you have turned off, and the numbers you have changed; kept with the other documents
  let NPREFS = { off: [], days: {} };
  const noticePrefs = async () => {
    const doc = await store.load('prefs', true).catch(() => null);
    const n = (doc || {}).notices || {};
    NPREFS = { doc: doc || {}, off: n.off || [], days: n.days || {} };
    return NPREFS;
  };
  const saveNoticePrefs = () => store.save('prefs', { ...(NPREFS.doc || {}), notices: { off: NPREFS.off, days: NPREFS.days } });
  const noticeDays = r => { const v = +(NPREFS.days || {})[r.id]; return v > 0 ? v : r.days; };

  const noticing = async ({ school, health, todo, today }) => {
    const [lib, inv, rules] = await Promise.all([store.load('library', true).catch(() => null), store.load('investments', true).catch(() => null), store.load('todo.rules', true).catch(() => null)]);
    await noticePrefs();
    const ctx = { school, health, todo, today, lib, inv, rules };
    const out = [];
    for (const r of NOTICES) {
      if ((NPREFS.off || []).includes(r.id)) continue;
      try { out.push(...r.find(ctx, noticeDays(r))); } catch {}
    }
    return out.slice(0, 6);
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
  const FOLD = 'hq.bell.syncs';
  const folded = () => { try { return localStorage.getItem(FOLD) !== 'open'; } catch { return true; } };
  const setFolded = v => { try { localStorage.setItem(FOLD, v ? 'shut' : 'open'); } catch {} };

  // the nudges /api/sync/notify can send, named here so one can be silenced without silencing the lot
  const NUDGES = [
    ['weight', 'Step on the scale', 'morning'], ['supplements', 'Supplements to take', 'morning'], ['firstup', 'What is first today', 'morning'],
    ['late', 'A to-do past its time', 'midday'], ['duetoday', 'Something due today', 'midday'],
    ['open', 'Still open tonight', 'evening'], ['pages', 'Pages before bed', 'evening'], ['pills', 'Supplements not ticked', 'evening'],
    ['cards', 'Three cards before bed', 'evening'], ['exam', 'An exam with nothing studied', 'evening'],
    ['week', 'The week, on a Sunday', 'Sunday'], ['syncs', 'A source that has stopped', 'morning'],
  ];

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
    .bellpop .go.dl ~ .go.dl{grid-row:4}
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
    .bellpop li.oops .n{color:var(--ox)}
    .bellpop li.oops .s{font-family:var(--mono,ui-monospace,monospace);font-size:11.5px;overflow-wrap:anywhere}
    .bellpop h4 ~ h4{margin-top:16px}
    .bellpop h4.fold{display:flex;align-items:baseline;gap:10px;cursor:pointer;padding-bottom:0;border-bottom:0}
    .bellpop h4.fold .tw{font-family:var(--sans);font-size:11px;color:var(--ink-3);transition:transform .15s}
    .bellpop h4.fold[aria-expanded=true] .tw{transform:rotate(90deg)}
    .bellpop h4.fold .sum{font-family:var(--sans);font-size:12.5px;color:var(--ink-3);margin-left:auto}
    .bellpop h4.fold .sum.bad{color:var(--ox)}
    .bellpop h4.fold + ul{margin-top:6px;padding-top:8px;border-top:1px solid var(--rule)}
    .bellpop h4.fold[aria-expanded=false] + ul{display:none}
    .bellpop h4.fold:hover{color:var(--ox)}
    .bellpop h4.watch{display:flex;align-items:baseline;gap:10px}
    .bellpop h4.watch .tune{margin-left:auto;font-family:var(--sans);font-size:11.5px;color:var(--ink-3);background:none;border:0;padding:0;cursor:pointer;letter-spacing:.03em}
    .bellpop h4.watch .tune:hover{color:var(--ox)}
    .bellpop .watchbox{padding:4px 0 2px}
    .bellpop .watchbox li{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px dotted var(--rule);font-size:13px}
    .bellpop .watchbox input[type=checkbox]{appearance:none;width:14px;height:14px;border:1px solid var(--ink-2);margin:0;display:grid;place-items:center;cursor:pointer;background:var(--paper);border-radius:2px;flex:none}
    .bellpop .watchbox input:checked{background:var(--band);border-color:var(--band)}
    .bellpop .watchbox input:checked::after{content:"";width:6px;height:4px;border:1.5px solid var(--band-ink);border-top:0;border-right:0;transform:translateY(-1px) rotate(-45deg)}
    .bellpop .watchbox label{flex:1;cursor:pointer;font-family:var(--serif);font-size:14px}
    .bellpop .watchbox .n{width:3.2ch;font-family:var(--serif);font-size:14px;text-align:right;border-bottom:1px dotted var(--ink-2);background:none;padding:0}
    .bellpop .watchbox .n:focus{outline:none;border-bottom-color:var(--ink)}
    .bellpop .watchbox .u{color:var(--ink-3);font-size:11.5px;white-space:nowrap}
    .row .right{position:relative}`;
  document.head.appendChild(style);

  addEventListener('DOMContentLoaded', async () => {
    const bell = document.querySelector('.band .ib[aria-label="Notifications"]'); if (!bell || !window.store) return;
    bell.classList.add('bell'); bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    bell.setAttribute('aria-expanded', 'false');
    let pop = null, ledger = {}, notes = { todos: [], due: [], noticed: [] };
    const paint = () => { bell.classList.toggle('bad', notes.todos.some(n => n.late) || notes.due.length > 0 || Object.values(ledger).some(l => l && l.ok === false) || faults().length > 0); };   // the dot: something late, something due, a failed sync, or a page that threw
    const section = (title, list) => list.length ? `<h4>${title}</h4><ul class="notices">${list.map(n => `<li class="${n.late ? 'late' : ''}">${n.k != null ? `<input type="checkbox" aria-label="Done: ${n.text}" data-k="${n.k}">` : ''}<a href="${n.href}"><span class="t">${n.text}</span><span class="w">${n.when}</span></a></li>`).join('')}</ul>` : '';
    const render = () => {
      const rows = Object.entries(SOURCES).map(([k, src]) => {
        const l = ledger[k];
        const status = !l ? 'not connected' : l.ok ? `${ago(l.last)}${src.count(l) ? ' · ' + src.count(l) : ''}` : `failed ${ago(l.last)} · ${esc(l.error || '')}`;
        return `<li><span class="n"><a href="${src.page}">${src.name}</a></span><span class="s ${l && !l.ok ? 'bad' : ''}">${status}</span>${l ? `<button class="go" type="button" data-sync="${k}">${k === 'backup' ? 'Back up now' : 'Sync now'}</button>${src.extra && l.ok ? src.extra(l) : ''}` : k === 'backup' ? `<button class="go" type="button" data-sync="${k}">Back up now</button>` : `<a class="go" href="${src.page}">Set up</a>`}</li>`;
      });
      // what the fold has to say for itself: a count, and loudly if something is failing
      const names = Object.keys(SOURCES), bad = names.filter(k => ledger[k] && ledger[k].ok === false);
      const sum = bad.length ? `${bad.length} failing` : `${names.filter(k => ledger[k]).length} of ${names.length} running`;
      const shut = folded();
      const noticed = notes.noticed || [];
      pop.innerHTML = `${section('To do', notes.todos)}${section('Due', notes.due)}`
        + `<h4 class="watch">Worth knowing<button type="button" class="tune" id="tunewatch">what to watch</button></h4>`
        + (noticed.length ? `<ul class="notices">${noticed.map(n => `<li class="${n.late ? 'late' : ''}"><a href="${n.href}"><span class="t">${n.text}</span><span class="w">${n.when}</span></a></li>`).join('')}</ul>`
                          : '<p class="empty">Nothing worth saying today.</p>')
        + `<div id="watchbox" hidden></div>`
        + `<h4 class="fold" id="syncfold" role="button" tabindex="0" aria-expanded="${!shut}"><span class="tw">\u25b8</span>Syncs<span class="sum ${bad.length ? 'bad' : ''}">${sum}</span></h4>`
        + `<ul>${rows.join('')}</ul>`
        + `<h4>This device</h4>`
        + `<ul><li id="pushrow"><span class="n">Reminders</span><span class="s">checking…</span></li>`
        + `<li><span class="n">What it may say</span><span class="s">the nudges, one by one</span><button class="go" type="button" id="tunenudge">Choose</button></li>`
        + `<li id="nudgebox" hidden></li>`
        + (() => { const f = faults(); if (!f.length) return '';
            const total = f.reduce((n, x) => n + x.n, 0);
            return f.slice(0, 3).map(faultRow).join('')
              + `<li><span class="n">Faults kept here</span><span class="s">${total} in this browser${f.length > 3 ? `, across ${f.length} pages` : ''}</span><button class="go" type="button" id="oopsclear">Clear</button></li>`; })()
        + `</ul>`;
      const paintWatch = () => {
        const box = pop.querySelector('#watchbox'); if (!box) return;
        box.className = 'watchbox';
        box.innerHTML = `<ul>${NOTICES.map(r => `<li data-r="${r.id}">
          <input type="checkbox" id="w-${r.id}" ${(NPREFS.off || []).includes(r.id) ? '' : 'checked'}>
          <label for="w-${r.id}">${r.name}</label>
          <input class="n" inputmode="numeric" value="${noticeDays(r)}" aria-label="After how many ${r.unit}">
          <span class="u">${r.unit}</span></li>`).join('')}</ul>`;
      };
      pop.querySelector('#tunewatch')?.addEventListener('click', () => {
        const box = pop.querySelector('#watchbox');
        if (!box.hidden) { box.hidden = true; return; }
        box.hidden = false; paintWatch();
      });
      pop.querySelector('#watchbox')?.addEventListener('change', async e => {
        const li = e.target.closest('[data-r]'); if (!li) return;
        const id = li.dataset.r;
        if (e.target.type === 'checkbox') {
          const off = new Set(NPREFS.off || []);
          e.target.checked ? off.delete(id) : off.add(id);
          NPREFS.off = [...off];
        } else {
          const v = parseInt(e.target.value, 10);
          const base = NOTICES.find(r => r.id === id);
          if (v > 0) NPREFS.days[id] = v; else { delete NPREFS.days[id]; e.target.value = base.days; }
        }
        saveNoticePrefs();
        notes = await notices(); paint(); render();
        pop.querySelector('#watchbox').hidden = false; paintWatch();
      });

      // once they have been read they are no use; the record is this browser's, so clearing it asks nobody
      pop.querySelector('#oopsclear')?.addEventListener('click', () => {
        try { window.hqOops && window.hqOops.clear(); } catch {}
        paint(); render();
      });
      pop.querySelector('#tunenudge')?.addEventListener('click', () => {
        const box = pop.querySelector('#nudgebox');
        if (!box.hidden) { box.hidden = true; return; }
        box.hidden = false; box.className = 'watchbox';
        const offs = new Set(((NPREFS.doc || {}).nudges || {}).off || []);
        box.innerHTML = `<ul>${NUDGES.map(([id, name, when]) => `<li data-n="${id}">
          <input type="checkbox" id="n-${id}" ${offs.has(id) ? '' : 'checked'}>
          <label for="n-${id}">${name}</label><span class="u">${when}</span></li>`).join('')}</ul>`;
      });
      pop.querySelector('#nudgebox')?.addEventListener('change', e => {
        const li = e.target.closest('[data-n]'); if (!li) return;
        const doc = NPREFS.doc || {};
        const set = new Set((doc.nudges || {}).off || []);
        e.target.checked ? set.delete(li.dataset.n) : set.add(li.dataset.n);
        NPREFS.doc = hqPrefs.save({ nudges: { off: [...set] } });
      });

      const fold = el => { const open = el.getAttribute('aria-expanded') === 'true'; el.setAttribute('aria-expanded', !open); if (el.id === 'syncfold') setFolded(open); };
      pop.querySelectorAll('h4.fold').forEach(h => {
        h.addEventListener('click', () => fold(h));
        h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fold(h); } });
      });
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
