// Garmin Connect → Health. Sleep, resting heart rate, weight and steps for the last week, into health.days.
// Garmin has no personal API, so this uses the unofficial garmin-connect library with your Connect sign-in
// (GARMIN_EMAIL, GARMIN_PASSWORD in env; MFA must be off on the Garmin account). Session tokens are kept in
// the private `_garmin` document so it signs in rarely. A value you typed by hand is never overwritten.
import { GarminConnect } from 'garmin-connect';
import { syncRoute } from './_run.js';

const TZ = process.env.HQ_TZ || 'America/Chicago';
const clock12 = ms => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value])); const h = +p.hour % 24; return `${h % 12 || 12}.${p.minute} ${h < 12 ? 'am' : 'pm'}`; };
const localDate = ms => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };

export default syncRoute('garmin', async ({ getDoc, putDoc }) => {
  const username = process.env.GARMIN_EMAIL, password = process.env.GARMIN_PASSWORD;
  if (!username || !password) throw new Error('GARMIN_EMAIL and GARMIN_PASSWORD are not set');
  const client = new GarminConnect({ username, password });
  const saved = await getDoc('_garmin');
  let signedIn = false;
  if (saved && saved.oauth1 && saved.oauth2) { try { client.loadToken(saved.oauth1, saved.oauth2); await client.getUserProfile(); signedIn = true; } catch { signedIn = false; } }
  if (!signedIn) { await client.login(username, password); const t = client.exportToken(); await putDoc('_garmin', { oauth1: t.oauth1, oauth2: t.oauth2, since: new Date().toISOString() }); }

  const health = (await getDoc('health')) || { days: {}, meds: [], next: [] };
  health.days ??= {};
  let filled = 0, days = 0;
  for (let back = 6; back >= 0; back--) {
    const key = localDate(Date.now() - back * 86400000); const d = new Date(key + 'T12:00:00Z');   // the library keys by UTC date; noon UTC lands on `key`
    const day = health.days[key] || { pills: [] }; day.pills ??= []; day.garmin ??= {};
    const set = (k, v, fmt = x => x) => { if (v == null || Number.isNaN(v)) return; day.garmin[k] = v; if (day[k] == null || day[k] === '') { day[k] = fmt(v); filled++; } };
    try { const s = await client.getSleepData(d); const dto = s && s.dailySleepDTO; if (dto && dto.sleepTimeSeconds) { set('sleep', dto.sleepTimeSeconds / 3600, v => (Math.round(v * 10) / 10).toString()); if (dto.sleepStartTimestampGMT) set('bed', clock12(dto.sleepStartTimestampGMT)); if (dto.sleepEndTimestampGMT) set('woke', clock12(dto.sleepEndTimestampGMT)); } } catch {}
    try { const h = await client.getHeartRate(d); if (h && h.restingHeartRate) set('hr', h.restingHeartRate, v => String(v)); } catch {}
    try { const w = await client.getDailyWeightInPounds(d); if (w && w > 0) set('weight', w, v => (Math.round(v * 10) / 10).toString()); } catch {}
    try { const st = await client.getSteps(d); if (st != null) day.garmin.steps = st; } catch {}
    health.days[key] = day; days++;
  }
  await putDoc('health', health);
  return { days, filled };
});
