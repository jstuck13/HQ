// The bell: what has synced, when, and whether anything failed. One script, every page.
(function () {
  const SOURCES = { canvas: { name: 'Canvas', page: 'school.html', count: l => l.items != null ? `${l.items} items` : '' },
                    google: { name: 'Google Calendar', page: 'calendar.html', count: l => l.calendars != null ? `${l.calendars} ${l.calendars === 1 ? 'calendar' : 'calendars'}` : '' },
                    garmin: { name: 'Garmin', page: 'health.html', count: l => l.days != null ? `${l.days} days` : '' },
                    daily: { name: 'Word and quote', page: 'index.html', count: l => l.word ? `“${l.word}”` : '' },
                    backup: { name: 'Nightly backup', page: 'today.html', count: l => l.documents != null ? `${l.documents} documents` : '', extra: l => l.day ? `<a class="go dl" href="/api/sync/backup?day=${l.day}" download>Download</a>` : '' } };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // three kinds of notice, nothing else: due today, a bill due today, pills not taken by nine in the evening
  const notices = async () => {
    const today = clock.today, ym = today.slice(0, 7), hour = new Date().getHours(), out = [];
    const [school, fin, health] = await Promise.all([store.load('school'), store.load('finances.' + ym), store.load('health')].map(p => p.catch(() => null)));
    for (const i of (school && school.items || []).filter(i => !i.done && i.due && i.due <= today)) out.push({ text: `${esc(i.title)} ${i.due < today ? 'is overdue' : 'is due today'}`, href: 'school.html' });
    if (fin) for (const c of (fin.cats || []).filter(c => c.due === new Date().getDate() && (c.bill || !(fin.tx || []).some(t => t.cat === c.id)))) out.push({ text: `${esc(c.bill || c.name)} is due today`, href: 'finances.html' });
    if (health && hour >= 21) { const meds = health.meds || [], taken = (health.days && health.days[today] || {}).pills || [], left = meds.filter(m => !taken.includes(m.id)); if (left.length) out.push({ text: `${left.map(m => esc(m.name)).join(', ')} not taken yet`, href: 'health.html' }); }
    return out.slice(0, 3);
  };
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
    .bellpop h4 + ul.notices li{display:block;padding:8px 0}
    .bellpop .notices a{font-family:var(--serif);font-size:15px;display:block}
    .bellpop .notices a::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--ox);margin:0 10px 2px 0}
    .bellpop h4.syncs{margin-top:14px}
    .row .right{position:relative}`;
  document.head.appendChild(style);

  addEventListener('DOMContentLoaded', async () => {
    const bell = document.querySelector('.band .ib[aria-label="Notifications"]'); if (!bell || !window.store) return;
    bell.classList.add('bell'); bell.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
    bell.setAttribute('aria-expanded', 'false');
    let pop = null, ledger = {}, notes = [];
    const paint = () => { bell.classList.toggle('bad', notes.length > 0 || Object.values(ledger).some(l => l && l.ok === false)); };
    const render = () => {
      const rows = Object.entries(SOURCES).map(([k, src]) => {
        const l = ledger[k];
        const status = !l ? 'not connected' : l.ok ? `${ago(l.last)}${src.count(l) ? ' · ' + src.count(l) : ''}` : `failed ${ago(l.last)} · ${esc(l.error || '')}`;
        return `<li><span class="n"><a href="${src.page}">${src.name}</a></span><span class="s ${l && !l.ok ? 'bad' : ''}">${status}</span>${l ? `<button class="go" type="button" data-sync="${k}">${k === 'backup' ? 'Back up now' : 'Sync now'}</button>${src.extra && l.ok ? src.extra(l) : ''}` : k === 'backup' ? `<button class="go" type="button" data-sync="${k}">Back up now</button>` : `<a class="go" href="${src.page}">Set up</a>`}</li>`;
      });
      pop.innerHTML = `${notes.length ? `<h4>Today</h4><ul class="notices">${notes.map(n => `<li><a href="${n.href}">${n.text}</a></li>`).join('')}</ul>` : ''}<h4 class="${notes.length ? 'syncs' : ''}">Syncs</h4><ul>${rows.join('')}</ul>`;
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
