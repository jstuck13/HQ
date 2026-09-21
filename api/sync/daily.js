// The day's word and quote, fetched once a night into the `daily` document for the welcome page.
// Word: one from the list below (rotating by day of year), with pronunciation, definition and an example from the
// Free Dictionary API. Quote: one of the philosophers' lines in quotes.js, rotating by day of year.
import { syncRoute } from './_run.js';
import QUOTES from './_quotes.js';

const WORDS = ['equanimity', 'assiduous', 'halcyon', 'lacuna', 'sanguine', 'perspicacious', 'vestige', 'ephemeral', 'sonorous', 'tenacity', 'verdant', 'laconic', 'penumbra', 'quiescent', 'erudite', 'susurrus', 'liminal', 'winsome', 'apricity', 'petrichor', 'sagacious', 'mellifluous', 'nadir', 'zenith', 'candor', 'diligent', 'ebullient', 'fastidious', 'gregarious', 'idyllic', 'juxtapose', 'kinetic', 'luminous', 'magnanimous', 'nascent', 'obdurate', 'placid', 'quixotic', 'resolute', 'serendipity', 'taciturn', 'ubiquitous', 'vicarious', 'wistful', 'abstruse', 'benevolent', 'circumspect', 'demure', 'eloquent', 'felicity', 'gossamer', 'harbinger', 'incandescent', 'jubilant', 'languid', 'meticulous', 'nonchalant', 'opulent', 'pellucid', 'redolent', 'salient', 'temperate', 'unfettered', 'venerable', 'zephyr', 'alacrity', 'brevity', 'cogent', 'dulcet', 'effervescent', 'fortitude', 'guile', 'impetus', 'lucid', 'mirth', 'nuance', 'ostensible', 'prudent', 'quandary', 'reverie', 'stoic', 'tranquil', 'umbrage', 'vivacious', 'wry', 'ardent', 'buoyant', 'copious', 'deft', 'earnest', 'fervent', 'genial', 'hallowed', 'intrepid', 'keen', 'lithe', 'modest', 'nimble', 'oblique', 'patient', 'quaint', 'rustic', 'sincere', 'tender', 'upright', 'valiant', 'wholesome'];

// The Publix weekly ad, by way of Flipp's aggregator: every BOGO for the week, keyed by the ad's first day; 26 weeks kept.
async function publix(getDoc, putDoc) {
  const g = await getDoc('groceries'); const zip = g && g.zip; if (!zip) return null;
  const r = await fetch(`https://backflipp.wishabi.com/flipp/items/search?locale=en-us&postal_code=${encodeURIComponent(zip)}&q=publix`, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('flipp ' + r.status);
  const j = await r.json(), seen = new Set(), items = [];
  for (const i of j.items || []) {
    if (!/buy 1 get 1/i.test(i.pre_price_text || '') || !i.valid_from) continue;
    const name = String(i.name || '').replace(/\s*BOGO\*?/i, '').replace(/[†*]/g, '').replace(/\s+/g, ' ').trim(); if (!name || seen.has(name)) continue; seen.add(name);
    items.push({ name, save: (i.sale_story || '').replace(/^save up to\s*/i, '') || undefined, img: i.clean_image_url || undefined, from: i.valid_from.slice(0, 10), to: i.valid_to ? i.valid_to.slice(0, 10) : undefined });
  }
  if (!items.length) return { bogos: 0 };
  const from = items.map(i => i.from).sort().pop(), week = items.filter(i => i.from === from);
  const doc = (await getDoc('publix')) || { weeks: {} }; doc.weeks ??= {};
  doc.weeks[from] = { from, to: week[0].to, zip, fetched: new Date().toISOString(), items: week.map(({ name, save, img }) => ({ name, save, img })) };
  for (const k of Object.keys(doc.weeks).sort().slice(0, -26)) delete doc.weeks[k];
  await putDoc('publix', doc);
  return { bogos: week.length, from };
}

export default syncRoute('daily', async ({ getDoc, putDoc }) => {
  const now = new Date(), date = now.toISOString().slice(0, 10);
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const out = { date, word: null, quote: null }, errors = [];

  const w = WORDS[doy % WORDS.length];
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
    if (r.ok) {
      const [e] = await r.json();
      const m = (e.meanings || []).find(m => m.definitions && m.definitions.length) || {};
      const d = (m.definitions || []).find(d => d.example) || (m.definitions || [])[0] || {};
      const pr = e.phonetic || (e.phonetics || []).map(p => p.text).find(Boolean) || '';
      if (d.definition) out.word = { w, pr, pos: m.partOfSpeech || '', def: d.definition[0].toUpperCase() + d.definition.slice(1).replace(/\.?$/, '.'), ex: d.example ? d.example[0].toUpperCase() + d.example.slice(1).replace(/\.?$/, '.') : '' };
    } else errors.push('dictionary ' + r.status);
  } catch (e) { errors.push('dictionary ' + e.message); }

  { const [q, a, w] = QUOTES[doy % QUOTES.length]; out.quote = { q, a, w }; }

  let ad = null; try { ad = await publix(getDoc, putDoc); } catch (e) { errors.push('publix ' + e.message); }

  await putDoc('daily', out);
  return { word: out.word ? out.word.w : null, quote: out.quote ? out.quote.a : null, bogos: ad ? ad.bogos : undefined, errors: errors.length ? errors.join('; ') : undefined };
});
