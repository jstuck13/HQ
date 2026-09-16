// The day's word and quote, fetched once a night into the `daily` document for the welcome page.
// Word: one from the list below (rotating by day of year), with pronunciation, definition and an example from the
// Free Dictionary API. Quote: ZenQuotes' quote of the day. Either can fail; the page keeps its built-in rotation then.
import { syncRoute } from './_run.js';

const WORDS = ['equanimity', 'assiduous', 'halcyon', 'lacuna', 'sanguine', 'perspicacious', 'vestige', 'ephemeral', 'sonorous', 'tenacity', 'verdant', 'laconic', 'penumbra', 'quiescent', 'erudite', 'susurrus', 'liminal', 'winsome', 'apricity', 'petrichor', 'sagacious', 'mellifluous', 'nadir', 'zenith', 'candor', 'diligent', 'ebullient', 'fastidious', 'gregarious', 'idyllic', 'juxtapose', 'kinetic', 'luminous', 'magnanimous', 'nascent', 'obdurate', 'placid', 'quixotic', 'resolute', 'serendipity', 'taciturn', 'ubiquitous', 'vicarious', 'wistful', 'abstruse', 'benevolent', 'circumspect', 'demure', 'eloquent', 'felicity', 'gossamer', 'harbinger', 'incandescent', 'jubilant', 'languid', 'meticulous', 'nonchalant', 'opulent', 'pellucid', 'redolent', 'salient', 'temperate', 'unfettered', 'venerable', 'zephyr', 'alacrity', 'brevity', 'cogent', 'dulcet', 'effervescent', 'fortitude', 'guile', 'impetus', 'lucid', 'mirth', 'nuance', 'ostensible', 'prudent', 'quandary', 'reverie', 'stoic', 'tranquil', 'umbrage', 'vivacious', 'wry', 'ardent', 'buoyant', 'copious', 'deft', 'earnest', 'fervent', 'genial', 'hallowed', 'intrepid', 'keen', 'lithe', 'modest', 'nimble', 'oblique', 'patient', 'quaint', 'rustic', 'sincere', 'tender', 'upright', 'valiant', 'wholesome'];

export default syncRoute('daily', async ({ putDoc }) => {
  const now = new Date(), date = now.toISOString().slice(0, 10);
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
  const out = { date, word: null, quote: null };

  const w = WORDS[doy % WORDS.length];
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
    if (r.ok) {
      const [e] = await r.json();
      const m = (e.meanings || []).find(m => m.definitions && m.definitions.length) || {};
      const d = (m.definitions || []).find(d => d.example) || (m.definitions || [])[0] || {};
      const pr = e.phonetic || (e.phonetics || []).map(p => p.text).find(Boolean) || '';
      if (d.definition) out.word = { w, pr, pos: m.partOfSpeech || '', def: d.definition[0].toUpperCase() + d.definition.slice(1).replace(/\.?$/, '.'), ex: d.example ? d.example[0].toUpperCase() + d.example.slice(1).replace(/\.?$/, '.') : '' };
    }
  } catch {}

  try {
    const r = await fetch('https://zenquotes.io/api/today');
    if (r.ok) { const [q] = await r.json(); if (q && q.q && q.a) out.quote = { q: q.q.trim(), a: q.a.trim(), via: 'ZenQuotes' }; }
  } catch {}

  await putDoc('daily', out);
  return { word: out.word ? out.word.w : null, quote: out.quote ? out.quote.a : null };
});
