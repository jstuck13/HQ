// The day's word and quote, fetched once a night into the `daily` document for the welcome page.
// Word: one from the list below (rotating by day of year), with pronunciation, definition and an example from the
// Free Dictionary API. Quote: one of the philosophers' lines in quotes.js, rotating by day of year.
import { syncRoute } from './_run.js';
import QUOTES from './_quotes.js';

const WORDS = ['equanimity', 'assiduous', 'halcyon', 'lacuna', 'sanguine', 'perspicacious', 'vestige', 'ephemeral', 'sonorous', 'tenacity', 'verdant', 'laconic', 'penumbra', 'quiescent', 'erudite', 'susurrus', 'liminal', 'winsome', 'apricity', 'petrichor', 'sagacious', 'mellifluous', 'nadir', 'zenith', 'candor', 'diligent', 'ebullient', 'fastidious', 'gregarious', 'idyllic', 'juxtapose', 'kinetic', 'luminous', 'magnanimous', 'nascent', 'obdurate', 'placid', 'quixotic', 'resolute', 'serendipity', 'taciturn', 'ubiquitous', 'vicarious', 'wistful', 'abstruse', 'benevolent', 'circumspect', 'demure', 'eloquent', 'felicity', 'gossamer', 'harbinger', 'incandescent', 'jubilant', 'languid', 'meticulous', 'nonchalant', 'opulent', 'pellucid', 'redolent', 'salient', 'temperate', 'unfettered', 'venerable', 'zephyr', 'alacrity', 'brevity', 'cogent', 'dulcet', 'effervescent', 'fortitude', 'guile', 'impetus', 'lucid', 'mirth', 'nuance', 'ostensible', 'prudent', 'quandary', 'reverie', 'stoic', 'tranquil', 'umbrage', 'vivacious', 'wry', 'ardent', 'buoyant', 'copious', 'deft', 'earnest', 'fervent', 'genial', 'hallowed', 'intrepid', 'keen', 'lithe', 'modest', 'nimble', 'oblique', 'patient', 'quaint', 'rustic', 'sincere', 'tender', 'upright', 'valiant', 'wholesome'];

// The Publix weekly ad, by way of Flipp's aggregator, for the ZIP kept on the Groceries page. The flyer endpoint has
// every item (name, price, picture); the search endpoint has the deal wording (Buy 1 Get 1, save up to…) for most of
// them. The current week keeps every item; older weeks keep only their BOGO names, for the cycles. 26 weeks kept.
async function publix(getDoc, putDoc) {
  const g = await getDoc('groceries'); const zip = g && g.zip; if (!zip) return null;
  const H = { headers: { 'user-agent': 'Mozilla/5.0' } }, base = 'https://backflipp.wishabi.com/flipp';
  const clean = n => String(n || '').replace(/\s*BOGO\*?/i, '').replace(/[^\x20-\x7E’]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  // deal wording, keyed by cleaned name, from two searches (each is capped at 150 items)
  const deals = {}; let flyerIds = {};
  for (const q of ['publix bogo', 'publix']) {
    const r = await fetch(`${base}/items/search?locale=en-us&postal_code=${encodeURIComponent(zip)}&q=${encodeURIComponent(q)}`, H); if (!r.ok) throw new Error('flipp ' + r.status);
    for (const i of (await r.json()).items || []) { if (i.merchant_name !== 'Publix') continue; flyerIds[i.flyer_id] = (flyerIds[i.flyer_id] || 0) + 1;
      const k = clean(i.name).toLowerCase(); deals[k] ??= { deal: i.pre_price_text || i.sale_story || i.post_price_text || '', save: (i.sale_story || '').replace(/^save up to\s*/i, ''), price: i.current_price, img: i.clean_image_url }; }
  }
  const flyerId = Object.keys(flyerIds).sort((a, b) => flyerIds[b] - flyerIds[a])[0]; if (!flyerId) return { items: 0 };
  const fr = await fetch(`${base}/flyers/${flyerId}?locale=en-us&postal_code=${encodeURIComponent(zip)}`, H); if (!fr.ok) throw new Error('flyer ' + fr.status);
  const raw = (await fr.json()).items || [], seen = new Set(), items = []; let from, to;
  for (const i of raw) {
    const name = clean(i.name); if (!name || seen.has(name) || /^publix(\.com.*)?$/i.test(name) || name.length < 3) continue; seen.add(name);
    const d = deals[name.toLowerCase()] || {}, bogo = /bogo/i.test(i.name) || /buy 1 get 1/i.test(d.deal || '');
    const price = i.price && +i.price ? +i.price : (d.price ? +d.price : undefined);
    items.push({ name, bogo: bogo || undefined, price, deal: bogo ? 'Buy one, get one free' : (d.deal || undefined), save: d.save || undefined, img: (i.cutout_image_url || d.img || '').replace(/^http:/, 'https:') || undefined });
    from ??= (i.valid_from || '').slice(0, 10); to ??= (i.valid_to || '').slice(0, 10);
  }
  if (!items.length || !from) return { items: 0 };
  const doc = (await getDoc('publix')) || { weeks: {} }; doc.weeks ??= {};
  for (const [k, w] of Object.entries(doc.weeks)) if (k !== from && w.items) doc.weeks[k] = { from: w.from, to: w.to, bogos: w.items.filter(x => x.bogo).map(x => x.name) };   // older weeks shrink to their BOGO names
  doc.weeks[from] = { from, to, zip, fetched: new Date().toISOString(), items };
  for (const k of Object.keys(doc.weeks).sort().slice(0, -26)) delete doc.weeks[k];
  await putDoc('publix', doc);
  return { items: items.length, bogos: items.filter(x => x.bogo).length, from };
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
