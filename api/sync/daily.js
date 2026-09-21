// The day's word and quote, fetched once a night into the `daily` document for the welcome page.
// Word: one from the list below (rotating by day of year), with pronunciation, definition and an example from the
// Free Dictionary API. Quote: one of the philosophers' lines in quotes.js, rotating by day of year.
import { syncRoute } from './_run.js';
import QUOTES from './_quotes.js';
export const maxDuration = 60;   // the ad's item pages take a few seconds in parallel

const WORDS = ['equanimity', 'assiduous', 'halcyon', 'lacuna', 'sanguine', 'perspicacious', 'vestige', 'ephemeral', 'sonorous', 'tenacity', 'verdant', 'laconic', 'penumbra', 'quiescent', 'erudite', 'susurrus', 'liminal', 'winsome', 'apricity', 'petrichor', 'sagacious', 'mellifluous', 'nadir', 'zenith', 'candor', 'diligent', 'ebullient', 'fastidious', 'gregarious', 'idyllic', 'juxtapose', 'kinetic', 'luminous', 'magnanimous', 'nascent', 'obdurate', 'placid', 'quixotic', 'resolute', 'serendipity', 'taciturn', 'ubiquitous', 'vicarious', 'wistful', 'abstruse', 'benevolent', 'circumspect', 'demure', 'eloquent', 'felicity', 'gossamer', 'harbinger', 'incandescent', 'jubilant', 'languid', 'meticulous', 'nonchalant', 'opulent', 'pellucid', 'redolent', 'salient', 'temperate', 'unfettered', 'venerable', 'zephyr', 'alacrity', 'brevity', 'cogent', 'dulcet', 'effervescent', 'fortitude', 'guile', 'impetus', 'lucid', 'mirth', 'nuance', 'ostensible', 'prudent', 'quandary', 'reverie', 'stoic', 'tranquil', 'umbrage', 'vivacious', 'wry', 'ardent', 'buoyant', 'copious', 'deft', 'earnest', 'fervent', 'genial', 'hallowed', 'intrepid', 'keen', 'lithe', 'modest', 'nimble', 'oblique', 'patient', 'quaint', 'rustic', 'sincere', 'tender', 'upright', 'valiant', 'wholesome'];

// The Publix weekly ad, by way of Flipp's aggregator, for the ZIP kept on the Groceries page. The flyer endpoint has
// every item (name, price, picture); the search endpoint has the deal wording (Buy 1 Get 1, save up to…) for most of
// them. The current week keeps every item; older weeks keep only their BOGO names, for the cycles. 26 weeks kept.
async function publix(getDoc, putDoc) {
  const g = await getDoc('groceries'); const zip = g && g.zip; if (!zip) return null;
  const H = { headers: { 'user-agent': 'Mozilla/5.0' } }, base = 'https://backflipp.wishabi.com/flipp';
  const clean = n => String(n || '').replace(/\s*BOGO\*?/i, '').replace(/[^\x20-\x7E’]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().replace(/[,;:\-–]+$/, '').trim();
  const saveOf = story => { const m = /save up to\s*\$?\s*([\d.]+)(\s*lb)?/i.exec(story || ''); return m ? `$${(+m[1]).toFixed(2).replace(/\.00$/, '')}${m[2] ? ' lb' : ''}` : undefined; };   // "SAVE UP TO 5.69" → "$5.69"
  const noteOf = story => story && !/save up to/i.test(story) && !/\d/.test(story) ? String(story).toLowerCase().replace(/^\w/, c => c.toUpperCase()) : undefined;   // "SURPRISINGLY LOW PRICE" → "Surprisingly low price\"
  // deal wording, keyed by cleaned name, from two searches (each is capped at 150 items)
  const deals = {}; let flyerIds = {};
  for (const q of ['publix bogo', 'publix']) {
    const r = await fetch(`${base}/items/search?locale=en-us&postal_code=${encodeURIComponent(zip)}&q=${encodeURIComponent(q)}`, H); if (!r.ok) throw new Error('flipp ' + r.status);
    for (const i of (await r.json()).items || []) { if (i.merchant_name !== 'Publix') continue; flyerIds[i.flyer_id] = (flyerIds[i.flyer_id] || 0) + 1;
      const k = clean(i.name).toLowerCase(); deals[k] ??= { deal: i.pre_price_text || i.sale_story || i.post_price_text || '', save: (i.sale_story || '').replace(/^save up to\s*/i, ''), price: i.current_price, img: i.clean_image_url }; }
  }
  const flyerId = Object.keys(flyerIds).sort((a, b) => flyerIds[b] - flyerIds[a])[0]; if (!flyerId) return { items: 0 };
  const fr = await fetch(`${base}/flyers/${flyerId}?locale=en-us&postal_code=${encodeURIComponent(zip)}`, H); if (!fr.ok) throw new Error('flyer ' + fr.status);
  const raw = ((await fr.json()).items || []).filter(i => { const n = clean(i.name); return n && n.length >= 3 && !/^publix(\.com.*)?$/i.test(n) && !/publix\.com|clubpublix|^save$|^assorted$/i.test(n); });
  // each item's own page carries the wording ("2 FOR" $5, "BUY 2 GET 1 FREE", "SAVE UP TO…"); fetched in parallel, a few seconds for the whole ad
  const detail = {}; const t0 = Date.now();
  for (let k = 0; k < raw.length && Date.now() - t0 < 20000; k += 25) {
    await Promise.all(raw.slice(k, k + 25).map(async i => { try { const r = await fetch(`${base}/items/${i.id}?locale=en-us`, H); if (r.ok) { const j = await r.json(); detail[i.id] = j.item || j; } } catch {} }));
  }
  const wording = (pre, price, story) => {
    const p = String(pre || '').trim(), n = /^(\d+)\s*(?:for|\/)/i.exec(p);
    if (/buy 1 get 1/i.test(p)) return 'Buy one, get one free';
    if (/^(per\s*)?lb\.?$/i.test(p) && price) return `$${(+price).toFixed(2)} lb`;
    if (n && price) return `${n[1]} for $${(+price).toFixed(2).replace(/\.00$/, '')}`;
    if (/buy \d+ get \d+/i.test(p)) return p.toLowerCase().replace(/^b/, 'B');
    if (p && !n) return p.toLowerCase().replace(/^\w/, c => c.toUpperCase());
    return story ? String(story).toLowerCase().replace(/^\w/, c => c.toUpperCase()) : undefined;
  };
  const seen = new Set(), items = []; let from, to;
  for (const i of raw) {
    const name = clean(i.name); if (seen.has(name)) continue; seen.add(name);
    const dt = detail[i.id] || {}, d = deals[name.toLowerCase()] || {};
    const pre = dt.pre_price_text || d.deal || '', bogo = /bogo/i.test(i.name) || /buy 1 get 1/i.test(pre);
    const price = (dt.current_price && +dt.current_price) || (i.price && +i.price) || (d.price && +d.price) || undefined;
    const multi = /^(\d+)\s*(?:for|\/)/i.exec(pre);
    items.push({ name, bogo: bogo || undefined, price: multi ? undefined : price, deal: bogo ? undefined : wording(pre, price, dt.sale_story || d.deal), save: bogo ? saveOf(dt.sale_story || (d.save ? 'save up to ' + d.save : '')) : undefined, note: noteOf(dt.sale_story || d.deal), desc: dt.description ? String(dt.description).slice(0, 90) : undefined, img: (i.cutout_image_url || d.img || '').replace(/^http:/, 'https:') || undefined });
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

// Prices for the holdings on the Investments page (Yahoo Finance's chart endpoint: stocks, ETFs and mutual funds alike),
// and a nightly total into the document's history so the worth-over-time line can be drawn.
async function prices(getDoc, putDoc) {
  const inv = await getDoc('investments'); if (!inv || !(inv.holdings || []).length) return null;
  const tickers = [...new Set(inv.holdings.map(h => String(h.ticker).toUpperCase()))]; inv.prices ??= {}; let got = 0;
  await Promise.all(tickers.map(async t => { try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=5d&interval=1d`, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) return; const m = (await r.json()).chart?.result?.[0]?.meta; if (!m || m.regularMarketPrice == null) return;
    inv.prices[t] = { price: m.regularMarketPrice, chg: m.regularMarketChangePercent ?? (m.chartPreviousClose ? (m.regularMarketPrice / m.chartPreviousClose - 1) * 100 : null), name: m.longName || m.shortName || t, at: new Date().toISOString() }; got++;
  } catch {} }));
  const latest = {}; [...(inv.balances || [])].sort((a, b) => a.date < b.date ? -1 : 1).forEach(b => { latest[b.account] = b.value; });
  const total = inv.holdings.reduce((n, h) => n + (inv.prices[String(h.ticker).toUpperCase()] ? h.shares * inv.prices[String(h.ticker).toUpperCase()].price : 0), 0) + Object.values(latest).reduce((n, v) => n + v, 0);
  inv.history ??= {}; if (got) inv.history[new Date().toISOString().slice(0, 10)] = Math.round(total * 100) / 100;
  for (const k of Object.keys(inv.history).sort().slice(0, -400)) delete inv.history[k];
  await putDoc('investments', inv);
  return { priced: got, of: tickers.length, worth: Math.round(total) };
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
  let px = null; try { px = await prices(getDoc, putDoc); } catch (e) { errors.push('prices ' + e.message); }

  await putDoc('daily', out);
  return { word: out.word ? out.word.w : null, quote: out.quote ? out.quote.a : null, bogos: ad ? ad.bogos : undefined, priced: px ? px.priced : undefined, worth: px ? px.worth : undefined, errors: errors.length ? errors.join('; ') : undefined };
});
