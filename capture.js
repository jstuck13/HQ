// The all-in-one box: one line of text, read for what it is. "12.40 lunch" is money, "173.2" on its own is a
// weight, "Dentist Thursday 3–4" is an appointment, anything else is a to-do — which may repeat, carry a
// deadline, carry a target, end on a date, or belong to another day.
//
// It lives here rather than on Today because The List has the same box, and a second copy of this reading
// would be a second copy to keep right. The markup it expects is the same on both pages:
//
//   <form class="addt" id="addt"><input id="t-text" required><button type="submit">Add</button></form>
//   <div class="propose" id="propose" hidden></div>
//   <p class="saidt" id="saidt" hidden></p>
//
// The page hands over its documents and what to redraw; the box wires its own form, says what it made, and
// asks before making several things at once:
//   todo() rules() cal() fin() health()      — each returns the document, making an empty one if need be
//   saveTodo() saveRules() saveCal() saveFin() saveHealth()
//   redraw(kind)                             — 'todo' | 'money' | 'weight' | 'calendar'
(function () {
  const tidy = x => x.replace(/\s+/g, ' ').replace(/^[\s,:;–—-]+|[\s,:;–—-]+$/g, '').trim();
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);   // two made in the same millisecond must not share an id

  window.hqCapture = function (ctx) {
    const C = clock, TODAY = C.today;   // esc, h12 and F come from hq.js, which every page loads first
    const ids = Object.assign({ form: 'addt', input: 't-text', said: 'saidt', propose: 'propose' }, ctx.ids);
    const el = id => document.getElementById(id);
    const now = () => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; };

    // ---- a deadline: "by" and "before" name one wherever they sit; a bare "at" only at the end, where it
    //      cannot be mistaken for the start of an appointment ----
    const atFrom = (h1, m2, ap) => { let h = +h1 % 12; const mm = +(m2 || 0) / 60, a = (ap || '').toLowerCase();
      if (a.startsWith('p')) h += 12; else if (!a && (h + mm <= now() || +h1 === 12)) h += 12;   // no am/pm: the next time that clock reading comes round
      return h + mm; };
    const parseAt = t => {
      const any = /\b(?:by|before)\s+(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i.exec(t);
      if (any && +any[1] <= 12) return { text: (t.slice(0, any.index) + ' ' + t.slice(any.index + any[0].length)).replace(/\s+/g, ' ').trim(), at: atFrom(any[1], any[2], any[3]) };
      const m = /\s(?:by|at)\s+(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\.?$/i.exec(t);
      if (!m || +m[1] > 12) return { text: t };
      return { text: t.slice(0, m.index).trim(), at: atFrom(m[1], m[2], m[3]) };
    };

    // ---- a target: a number with a unit, which nothing else the box reads ever has — money is a bare amount
    //      or carries a currency mark, a weight is a bare number. The phrase is read and left where it is,
    //      since cutting it out would leave "read of Project Hail Mary" ----
    const UNITS_T = 'pages?|minutes?|mins?|hours?|hrs?|km|kilometres?|kilometers?|miles?|sets?|reps?|glasses|cups?|words?|chapters?';
    const UNIT_NAME = u => { const w = u.toLowerCase();
      return /^pages?$/.test(w) ? 'pages' : /^(minutes?|mins?)$/.test(w) ? 'min' : /^(hours?|hrs?)$/.test(w) ? 'h'
        : /^(km|kilomet)/.test(w) ? 'km' : /^miles?$/.test(w) ? 'miles' : /^sets?$/.test(w) ? 'sets'
        : /^reps?$/.test(w) ? 'reps' : /^glasses$/.test(w) ? 'glasses' : /^cups?$/.test(w) ? 'cups'
        : /^words?$/.test(w) ? 'words' : 'chapters'; };
    const takeTarget = t => {
      const m = new RegExp('\\b(\\d{1,4}(?:\\.\\d{1,2})?)\\s*(' + UNITS_T + ')\\b', 'i').exec(t);
      return m ? { text: t, target: { n: +m[1], unit: UNIT_NAME(m[2]) } } : { text: t };
    };

    // ---- an end: a day it stops on, or a stretch from today. Both say when, so both become one date ----
    const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
    const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    // "December" means the end of it; "the 20th" the next 20th; a weekday the next one of those
    const untilDate = w => {
      const t = w.toLowerCase().replace(/^the\s+/, '');
      const mi = MONTHS.findIndex(x => x === t || x.slice(0, 3) === t.slice(0, 3));
      if (mi >= 0) { const y = C.now.getFullYear() + (mi < C.now.getMonth() ? 1 : 0); return C.iso(new Date(y, mi + 1, 0, 12)); }
      const nth = /^(\d{1,2})(?:st|nd|rd|th)?$/.exec(t);
      if (nth) { const dd = +nth[1]; if (dd < 1 || dd > 31) return null;
        const n = C.now, m = dd >= n.getDate() ? n.getMonth() : n.getMonth() + 1;
        return C.iso(new Date(n.getFullYear(), m, dd, 12)); }
      try { const d = C.parseDay(t); if (d && d > TODAY) return d; } catch {}
      return null;
    };
    const takeUntil = t => {
      const span = /\bfor\s+(?:the\s+next\s+)?(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+(days?|weeks?|months?)\b/i.exec(t);
      if (span) {
        const n = +span[1] || WORDNUM[span[1].toLowerCase()] || 1;
        const mult = /^week/i.test(span[2]) ? 7 : /^month/i.test(span[2]) ? 30 : 1;
        return { text: (t.slice(0, span.index) + ' ' + t.slice(span.index + span[0].length)).replace(/\s+/g, ' ').trim(),
                 until: C.iso(C.addDays(C.now, n * mult)) };
      }
      const m = /\b(?:until|till|thru|through|up to)\s+((?:the\s+)?[a-z0-9]+(?:\s+\d{1,2})?)/i.exec(t);
      if (!m) return { text: t };
      const until = untilDate(m[1].trim());
      if (!until) return { text: t };
      return { text: (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(), until };
    };

    // ---- how often it comes back. Three shapes: 'daily', 'weekdays', a weekday number, or { every: n, from }
    //      for a period. The phrase is looked for anywhere in the sentence, not only at its end, since
    //      "on every day before 9 pm" puts it in the middle. ----
    const DAYNAMES = window.hqRecur.DAYNAMES;
    const REP_RE = /\b(?:on\s+)?every\s+(other\s+day|second\s+day|third\s+day|\d{1,2}\s*(?:nd|rd|th)?\s+days?|day|weekdays?|[a-z]{3,9}day|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
    const takeRep = t => {
      const m = REP_RE.exec(t);
      if (!m) return { text: t };
      const w = m[1].toLowerCase().replace(/\s+/g, ' ').trim();
      let rep = null;
      if (w === 'day') rep = 'daily';
      else if (w === 'weekday' || w === 'weekdays') rep = 'weekdays';
      else if (w === 'other day' || w === 'second day') rep = { every: 2, from: TODAY };
      else if (w === 'third day') rep = { every: 3, from: TODAY };
      else { const n = /^(\d{1,2})/.exec(w);
        if (n && +n[1] >= 1) rep = +n[1] === 1 ? 'daily' : { every: +n[1], from: TODAY };
        else { const i = DAYNAMES.findIndex(d => d === w || d.slice(0, 3) === w.slice(0, 3)); if (i >= 0) rep = i; } }
      if (rep === null) return { text: t };
      return { text: (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(), rep };
    };

    // ---- a day named in the text — today, tomorrow, a weekday, or "17 Oct" — taken out of it ----
    const hourOf = (h, m, ap, ref) => { let n = +h % 12; if (ap && ap[0].toLowerCase() === 'p') n += 12;
      else if (!ap && n + (+m || 0) / 60 < (ref != null ? ref : 7)) n += 12;   // no am/pm: the reading that is still to come
      return n + (+m || 0) / 60; };
    function parseDayWord(raw) {
      const t = ' ' + String(raw).trim();
      const dm = /\s(today|tonight|tomorrow|tmrw|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(t)
              || /\s(\d{1,2}\s+[A-Za-z]{3,9}|[A-Za-z]{3,9}\s+\d{1,2})(?:\b|$)/.exec(t);
      if (!dm) return null;
      const w = dm[1].toLowerCase();
      let date = null;
      if (w === 'today' || w === 'tonight') date = TODAY;
      else if (w === 'tomorrow' || w === 'tmrw') date = C.iso(C.addDays(C.now, 1));
      else { const i = DAYNAMES.findIndex(n => n.startsWith(w.slice(0, 3)));
        if (i >= 0) { let n = (i - C.now.getDay() + 7) % 7; if (!n) n = 7; date = C.iso(C.addDays(C.now, n)); }   // "Thursday" means the next one
        else { const guess = C.parseDay(dm[1]); if (guess && guess !== TODAY) date = guess; } }
      if (!date) return null;
      return { date, said: dm[1], text: tidy(t.slice(0, dm.index) + ' ' + t.slice(dm.index + dm[0].length)) };
    }

    // ---- an appointment, told apart from a to-do by having a span or a day of its own. "Dentist 3–4 pm" and
    //      "Coffee Thursday at 10" are appointments; "Call the dentist by 3 pm" stays a to-do. ----
    function parseWhen(raw) {
      if (/\bby\s+\d/i.test(raw)) return null;              // "by" names a deadline, which is a to-do however much else is in the line
      let t = ' ' + raw.trim(), date = null, said = null;
      const dw = parseDayWord(raw);
      if (dw && dw.date) { date = dw.date; said = dw.said; t = ' ' + dw.text; }
      let start = null, end = null;
      // a span is only a span of time: with no am or pm both ends must read as a clock, and a unit right after
      // it means it was a count all along — "pages 10 to 20", "5 to 10 km"
      const UNITS = /^\s*(km|mi|miles?|k|pages?|pp|reps?|sets?|kg|lbs?|pounds?|people|minutes?|mins?|days?|weeks?|months?|years?|%|dollars?)\b/i;
      const span = /\s(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to|until|till)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\b/i.exec(t);
      const spanIsClock = span && (span[3] || span[6] || (+span[1] >= 1 && +span[1] <= 12 && +span[4] >= 1 && +span[4] <= 12))
        && !UNITS.test(t.slice(span.index + span[0].length));
      if (spanIsClock) {
        end = hourOf(span[4], span[5], span[6] || span[3]);
        start = hourOf(span[1], span[2], span[3] || span[6], end);
        if (end <= start) end = Math.min(24, start + 1);
        t = t.slice(0, span.index) + ' ' + t.slice(span.index + span[0].length);
      } else {
        // a single time, with "at" or a named day, and perhaps a length: "at 3 pm for 45 min"
        const one = /\s(?:at|@)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)?\b/i.exec(t) || (date ? /\s(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\b/i.exec(t) : null);
        if (one) {
          start = hourOf(one[1], one[2], one[3]);
          t = t.slice(0, one.index) + ' ' + t.slice(one.index + one[0].length);
          const len = /\sfor\s+(?:(half)\s+)?(?:(an?)\s+)?(\d+(?:\.\d+)?)?\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i.exec(t);
          if (len) { const n = len[1] ? 0.5 : len[2] ? 1 : +(len[3] || 1); end = start + (/^h/i.test(len[4]) ? n : n / 60);
            t = t.slice(0, len.index) + ' ' + t.slice(len.index + len[0].length); }
          else end = start + 1;
        }
      }
      if (start == null) return null;                       // no time at all: not an appointment
      if (!span && !date) return null;                      // a bare "at 3" today is a to-do, as it always was
      const title = tidy(t.replace(/\s+(on|at|from)$/i, ''));
      if (!title) return null;
      return { title, date: date || TODAY, start, end: Math.min(24, end), said };
    }

    // ---- money ----
    const money = s => { const m = /^\$?(\d{1,6}(?:,\d{3})*(?:\.\d{2}))\b/.exec(s.trim()) || /\$(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)\b/.exec(s); return m ? +m[1].replace(/,/g, '') : null; };
    const whatOf = s => s.replace(/^\$?\d[\d,]*(?:\.\d{2})?\s*/, '').replace(/\$\d[\d,]*(?:\.\d{1,2})?/, '').replace(/^(on|for|at)\s+/i, '').trim();
    // a category is not guessed from thin air: it is the one this description went to last time
    const catFor = (what, fin) => { const w = what.toLowerCase();
      const prev = (fin.tx || []).filter(t => t.what && t.cat).reverse().find(t => t.what.toLowerCase() === w) ||
                   (fin.tx || []).filter(t => t.what && t.cat).reverse().find(t => t.what.toLowerCase().includes(w) || w.includes(t.what.toLowerCase()));
      if (prev) return prev.cat;
      const named = (fin.cats || []).find(c => w.includes(c.name.toLowerCase()));
      return named ? named.id : '';
    };

    // ---- one sentence, possibly several things ----
    // A capture is split only on a strong signal: a semicolon, or commas when more than one clause carries its
    // own "every …". Splitting on every comma would wreck "Dentist, Tuesday 3 pm", which is one thing. What is
    // said once and belongs to all of them — a deadline, an end — is carried across.
    const TYPEHINT = /^\s*(to-?\s?dos?|todos?|tasks?|reminders?)\s*[,:]\s*/i;
    const splitCapture = raw => {
      let t = raw.trim(), hint = null;
      const h = TYPEHINT.exec(t); if (h) { hint = 'todo'; t = t.slice(h[0].length); }
      let parts = t.split(/\s*;\s*/).filter(Boolean);
      if (parts.length === 1) {
        const commas = t.split(/\s*,\s*(?:and\s+)?|\s+and\s+(?=\S)/).filter(Boolean);
        // two or more clauses each describing how often: that is a list, not one sentence with commas in it
        if (commas.length > 1 && commas.filter(c => REP_RE.test(c)).length > 1) parts = commas;
      }
      return { parts: parts.map(x => x.trim()).filter(Boolean), hint };
    };

    // What a capture would make, as a list. Nothing is written here.
    function planCapture(raw) {
      const { parts, hint } = splitCapture(raw);
      if (parts.length < 2) return null;                    // one thing: the ordinary path handles it
      const plans = parts.map(part => {
        const r = takeRep(part), u = takeUntil(r.text), g = takeTarget(u.text);
        const p = parseAt(g.text);
        return { text: tidy(p.text), at: p.at, rep: r.rep, target: g.target, until: u.until };
      });
      const anyUntil = plans.find(x => x.until);            // an end said once belongs to all of them too
      if (anyUntil) plans.forEach(x => { if (!x.until) x.until = anyUntil.until; });
      const anyAt = plans.find(x => x.at != null);          // a time said once belongs to all of them
      if (anyAt) plans.forEach(x => { if (x.at == null) x.at = anyAt.at; });
      if (hint === 'todo') plans.forEach(x => { x.kind = 'todo'; });
      return plans.every(x => x.text) ? plans : null;
    }

    function makePlanned(plans) {
      const T = ctx.todo(), RULES = ctx.rules();
      T.items ??= []; RULES.rules ??= [];
      for (const x of plans) {
        if (x.rep != null) {
          const id = uid('r');
          RULES.rules.push({ id, text: x.text, at: x.at, rep: x.rep, target: x.target, until: x.until });
          if (window.hqRecur.on(x.rep, TODAY) && !T.items.some(i => i.rule === id)) T.items.push({ text: x.text, at: x.at, done: false, rule: id, target: x.target });
        } else T.items.push({ text: x.text, at: x.at, done: false, target: x.target });
      }
      ctx.saveRules(); ctx.saveTodo(); ctx.redraw('todo');
      return plans.length;
    }

    // what it made, said for a few seconds
    function said(text) { const e = el(ids.said); if (!e) return;
      e.textContent = text; e.hidden = false; clearTimeout(said.t); said.t = setTimeout(() => { e.hidden = true; }, 6000); }

    // the proposal: what it read, before anything is written
    function propose(raw, plans) {
      const box = el(ids.propose);
      if (!box) { makePlanned(plans); return; }
      box.hidden = false;
      box.innerHTML = `<p class="pq">More than one thing in that. Make them?</p><ul>${plans.map(x => `<li><span class="t">${esc(x.text)}</span><span class="w">${[x.rep != null ? window.hqRecur.says(x.rep) : 'today', x.target ? `${x.target.n} ${x.target.unit}` : '', x.at != null ? 'by ' + h12(x.at) : '', x.until ? 'until ' + C.dayMonth(C.fromISO(x.until)) : ''].filter(Boolean).join(' · ')}</span></li>`).join('')}</ul>
        <p class="pa"><button class="textbtn" type="button" id="pyes">Yes, make ${plans.length}</button><button class="textbtn" type="button" id="pno">No, just one to-do</button></p>`;
      const clear = () => { box.hidden = true; const i = el(ids.input); if (i) i.value = ''; };
      el('pyes').addEventListener('click', () => { const n = makePlanned(plans); clear(); said(`Made ${n} standing to-dos`); });
      el('pno').addEventListener('click', () => { clear(); capture(raw, true); });
    }

    async function capture(raw, asOne) {
      const t = raw.trim(); if (!t) return;
      if (!asOne) { const plans = planCapture(t); if (plans) { propose(t, plans); return; } }
      // money
      const amt = money(t);
      if (amt != null && amt > 0) {
        const what = whatOf(t) || 'Something', fin = ctx.fin();
        const cat = catFor(what, fin);
        fin.tx = fin.tx || []; fin.tx.push({ id: uid('t'), date: TODAY, what: what[0].toUpperCase() + what.slice(1), cat, amt });
        ctx.saveFin();
        const cname = (fin.cats || []).find(c => c.id === cat);
        said(`$${amt.toFixed(2)} logged${cname ? ` to ${cname.name}` : ', with no category yet'} · Finances`);
        ctx.redraw('money'); return;
      }
      // a weight, on its own
      const wt = /^\d{2,3}(?:\.\d)?$/.test(t) ? +t : null;
      if (wt != null && wt >= 60 && wt <= 500) {
        const H = ctx.health(); H.days ??= {};
        (H.days[TODAY] ??= { pills: [] }).weight = String(wt);
        ctx.saveHealth(); said(`${wt} lb logged · Health`); ctx.redraw('weight'); return;
      }
      // an appointment
      const when = parseWhen(t);
      if (when) {
        const cal = ctx.cal(); cal.series ??= []; cal.cats ??= [];
        const named = cal.cats.find(c => c.name && when.title.toLowerCase().includes(c.name.toLowerCase().replace(/s$/, '')));
        cal.series.push({ id: uid('c'), title: when.title, date: when.date, start: when.start, end: when.end, cat: (named || {}).id || 'cal', rep: [], sub: '' });
        ctx.saveCal();
        store.sync('calpush');                              // and on to Google, if that is switched on
        said(`“${when.title}” on ${when.date === TODAY ? 'today' : C.dayMonth(C.fromISO(when.date))} at ${h12(when.start)} · Calendar`);
        ctx.redraw('calendar'); return;
      }
      // a to-do, which may repeat, may carry a time, and may belong to another day
      const T = ctx.todo(), RULES = ctx.rules();
      T.items ??= [];
      const r = takeRep(t);
      if (r.rep != null) {
        const u = takeUntil(r.text), g = takeTarget(u.text); const p = parseAt(g.text); p.text = tidy(p.text);
        const id = uid('r');
        (RULES.rules ??= []).push({ id, text: p.text, at: p.at, rep: r.rep, target: g.target, until: u.until }); ctx.saveRules();
        if (window.hqRecur.on(r.rep, TODAY) && !(u.until && TODAY > u.until)) T.items.push({ text: p.text, at: p.at, done: false, rule: id, target: g.target });
        said(`“${p.text}” will come back ${window.hqRecur.says(r.rep)}${g.target ? `, ${g.target.n} ${g.target.unit} a time` : ''}${u.until ? `, until ${C.dayMonth(C.fromISO(u.until))}` : ''}`);
        ctx.saveTodo(); ctx.redraw('todo'); return;
      }
      const dw = parseDayWord(r.text);
      const g0 = takeTarget(dw ? dw.text : r.text);
      const p = parseAt(g0.text);
      p.text = tidy(p.text);
      if (g0.target) p.target = g0.target;
      if (dw && dw.date !== TODAY) {                        // a day of its own: it waits in that day's list
        const key = 'today.' + dw.date;
        const doc = (await store.load(key)) || { items: [] };
        doc.items ??= []; doc.items.push({ ...p, done: false });
        store.save(key, doc);
        said(`“${p.text}” on ${C.dayMonth(C.fromISO(dw.date))}${p.at != null ? ` by ${h12(p.at)}` : ''} — it will be waiting`);
        ctx.redraw('todo'); return;
      }
      T.items.push({ ...p, done: false });
      ctx.saveTodo(); ctx.redraw('todo');
    }

    const form = el(ids.form);
    if (form) form.addEventListener('submit', e => { e.preventDefault();
      const i = el(ids.input), t = i.value.trim(); if (!t) return; form.reset(); capture(t); });

    return { capture, said, planCapture, parseAt, takeRep, takeTarget, takeUntil, parseWhen, parseDayWord, money, whatOf, catFor, tidy, uid };
  };
})();
