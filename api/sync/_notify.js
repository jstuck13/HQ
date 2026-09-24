// Reminders, pushed to the phone. Runs on a cron a few times a day; each run works out which slot it is in
// (morning, midday, evening, in HQ_TZ), composes one notice from what the documents say, and sends it once.
// Nothing is sent when there is nothing to say. VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT in env.
import webpush from 'web-push';
import { syncRoute } from './_run.js';

const TZ = process.env.HQ_TZ || 'America/Chicago';
const local = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, h: (+p.hour % 24) + (+p.minute) / 60 }; };
const h12 = h => { const hr = Math.floor(h), m = Math.round((h % 1) * 60); return `${hr % 12 || 12}.${String(m).padStart(2, '0')} ${hr < 12 ? 'am' : 'pm'}`; };
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const slotOf = h => h >= 6 && h < 10 ? 'morning' : h >= 11 && h < 15 ? 'midday' : h >= 18 && h < 22 ? 'evening' : null;
const KINDS = [[/\b(final|midterm|exam)\b|^E\d\b/i, 5], [/\btest\b/i, 4], [/\bquiz\b/i, 3]];
const heavy = it => { const k = KINDS.find(([re]) => re.test(it.title)); let w = k ? k[1] : it.type === 'test' ? 4 : 2; if (it.pts > 0) w = Math.max(w, Math.min(5, 1 + it.pts / 25)); return w >= 4; };

export default syncRoute('notify', async ({ getDoc, putDoc }) => {
  const { date: today, h } = local(), slot = slotOf(h);
  if (!slot) return { slot: 'none', sent: 0 };
  const push = (await getDoc('_push')) || { subs: [], sent: {} };
  if (!push.subs.length) return { slot, sent: 0, devices: 0 };
  push.sent ??= {}; if (push.sent[today] && push.sent[today][slot] ) return { slot, sent: 0, already: true };
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) throw new Error('VAPID keys are not set');

  const [health, todo, school, lib, study] = await Promise.all([getDoc('health'), getDoc('today.' + today), getDoc('school'), getDoc('library'), getDoc('study')]);
  const L = health && health.days && health.days[today] || {}, meds = health && health.meds || [], items = todo && todo.items || [];
  const lines = []; let url = 'today.html';

  if (slot === 'morning') {
    if (L.weight == null) { lines.push('Step on the scale — weight is not logged yet.'); url = 'health.html'; }
    if (meds.length && !(L.pills || []).length) lines.push(`${meds.length} ${meds.length === 1 ? 'supplement' : 'supplements'} to take.`);
    const first = items.filter(i => !i.done && i.at != null).sort((a, b) => a.at - b.at)[0];
    if (first) lines.push(`First up: ${first.text} by ${h12(first.at)}.`);
  }
  if (slot === 'midday') {
    const late = items.filter(i => !i.done && i.at != null && i.at < h);
    for (const i of late.slice(0, 2)) lines.push(`“${i.text}” was due by ${h12(i.at)}.`);
    const due = (school && school.items || []).filter(i => !i.done && i.due === today);
    for (const i of due.slice(0, 2)) { lines.push(`${i.title} is due today and is not ticked.`); url = 'school.html'; }
  }
  if (slot === 'evening') {
    const open = items.filter(i => !i.done);
    if (open.length) lines.push(open.length === 1 ? `“${open[0].text}” is still open on today’s list.` : `${open.length} things still open on today’s list.`);
    const book = lib && (lib.books || []).find(b => b.shelf === 'reading');
    if (book && !(book.log && book.log[today])) { const left = book.pages ? book.pages - (book.page || 0) : null; lines.push(`Twenty pages of ${book.title} before bed?${left ? ` ${left} to go.` : ''}`); if (!open.length) url = 'library.html'; }
    if (meds.length) { const left = meds.filter(m => !(L.pills || []).includes(m.id)); if (left.length) lines.push(`${left.map(m => m.name).join(', ')} not ticked yet.`); }
    if (study && study.pos > 0 && !(study.days && study.days[today] && study.days[today].done)) { lines.push(`Three cards before bed? ${({ stoics: 'The Stoics are', socrates: 'Socrates is', sermon: 'The Sermon is' })[study.path] || 'The Study is'} waiting.`); if (!open.length) url = 'study.html'; }
    if (school) { const weekMin = cid => (school.sessions || []).filter(s => s.course === cid && days(s.date, today) >= 0 && days(s.date, today) < 7).reduce((n, s) => n + s.min, 0);
      const soon = (school.items || []).filter(i => !i.done && heavy(i) && days(today, i.due) >= 0 && days(today, i.due) <= 3 && weekMin(i.course) === 0)[0];
      if (soon) { const d = days(today, soon.due); lines.push(`${soon.title} is ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`} and nothing has been studied this week.`); } }
  }
  if (!lines.length) { push.sent[today] = { ...(push.sent[today] || {}), [slot]: 'nothing' }; await putDoc('_push', push); return { slot, sent: 0, quiet: true }; }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hq@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const title = slot === 'morning' ? 'Good morning' : slot === 'midday' ? 'Midday' : 'This evening';
  const payload = JSON.stringify({ title, body: lines.slice(0, 3).join('\n'), url: '/' + url, tag: 'hq-' + slot });
  let sent = 0; const keep = [];
  for (const s of push.subs) { try { await webpush.sendNotification(s, payload, { TTL: 3600 }); sent++; keep.push(s); } catch (e) { if (e.statusCode === 404 || e.statusCode === 410) continue; keep.push(s); } }   // a gone device is dropped
  push.subs = keep; push.sent[today] = { ...(push.sent[today] || {}), [slot]: new Date().toISOString() };
  for (const k of Object.keys(push.sent)) if (days(k, today) > 7) delete push.sent[k];
  await putDoc('_push', push);
  return { slot, sent, devices: keep.length, said: lines.join(' ') };
});
