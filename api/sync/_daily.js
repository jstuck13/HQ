// The day's word and quote, fetched once a night into the `daily` document for the welcome page.
// Word: one from the list below (rotating by day of year), with pronunciation, definition and an example from the
// Free Dictionary API. Quote: one of the philosophers' lines in quotes.js, rotating by day of year.
import { syncRoute } from './_run.js';
import QUOTES from './_quotes.js';
// (maxDuration lives on the route file, api/sync/[name].js)

const WORDS = [
  'equanimity', 'assiduous', 'halcyon', 'lacuna', 'sanguine', 'perspicacious', 'vestige', 'ephemeral', 'sonorous', 'tenacity',
  'verdant', 'laconic', 'penumbra', 'quiescent', 'erudite', 'susurrus', 'liminal', 'winsome', 'apricity', 'petrichor',
  'sagacious', 'mellifluous', 'nadir', 'zenith', 'candor', 'diligent', 'ebullient', 'fastidious', 'gregarious', 'idyllic',
  'juxtapose', 'kinetic', 'luminous', 'magnanimous', 'nascent', 'obdurate', 'placid', 'quixotic', 'resolute', 'serendipity',
  'taciturn', 'ubiquitous', 'vicarious', 'wistful', 'abstruse', 'benevolent', 'circumspect', 'demure', 'eloquent', 'felicity',
  'gossamer', 'harbinger', 'incandescent', 'jubilant', 'languid', 'meticulous', 'nonchalant', 'opulent', 'pellucid', 'redolent',
  'salient', 'temperate', 'unfettered', 'venerable', 'zephyr', 'alacrity', 'brevity', 'cogent', 'dulcet', 'effervescent',
  'fortitude', 'guile', 'impetus', 'lucid', 'mirth', 'nuance', 'ostensible', 'prudent', 'quandary', 'reverie',
  'stoic', 'tranquil', 'umbrage', 'vivacious', 'fervent', 'intrepid', 'oblique', 'abeyance', 'abjure', 'abnegation',
  'aborning', 'abrogate', 'abstemious', 'accolade', 'acerbic', 'acuity', 'adamantine', 'adduce', 'adumbrate', 'aegis',
  'aesthete', 'affable', 'aggrandise', 'alacritous', 'albeit', 'allegory', 'alloy', 'altruism', 'amanuensis', 'ambit',
  'ameliorate', 'amenable', 'amorphous', 'anachronism', 'anodyne', 'anomalous', 'antediluvian', 'antipathy', 'aphorism', 'aplomb',
  'apocryphal', 'apogee', 'apposite', 'approbation', 'arabesque', 'arcadian', 'archetype', 'arduous', 'arrant', 'artifice',
  'ascetic', 'asperity', 'aspersion', 'assay', 'assuage', 'astringent', 'atavistic', 'attenuate', 'audacity', 'augury',
  'auspicious', 'austere', 'autodidact', 'avarice', 'aver', 'avuncular', 'axiom', 'badinage', 'baleful', 'balk',
  'banal', 'bastion', 'beatific', 'bedizen', 'beguile', 'belie', 'bellicose', 'benighted', 'bequest', 'bereft',
  'besot', 'bestride', 'bibulous', 'bilious', 'blandishment', 'blithe', 'bombast', 'bowdlerise', 'braggadocio', 'bravura',
  'brindled', 'bucolic', 'burgeon', 'burnish', 'cabal', 'cacophony', 'cadence', 'cajole', 'callow', 'canard',
  'candour', 'canonical', 'capacious', 'capricious', 'captious', 'carapace', 'castigate', 'casuistry', 'cataclysm', 'catalyst',
  'catharsis', 'caustic', 'cavil', 'celerity', 'censure', 'cerebral', 'chagrin', 'chaparral', 'charlatan', 'chary',
  'chasten', 'chicanery', 'chimerical', 'churlish', 'ciphers', 'circumlocution', 'clandestine', 'clemency', 'coalesce', 'coda',
  'cogitate', 'cognisant', 'collate', 'colloquy', 'comely', 'commensurate', 'compendium', 'complaisant', 'compunction', 'conciliate',
  'concomitant', 'confluence', 'conflate', 'congenial', 'conjecture', 'connive', 'consonance', 'construe', 'contiguous', 'contrite',
  'contumely', 'conundrum', 'convivial', 'copse', 'corollary', 'coruscate', 'cosset', 'countenance', 'covenant', 'covetous',
  'cower', 'crepuscular', 'croon', 'crucible', 'cryptic', 'culminate', 'cupidity', 'cursory', 'cyclical', 'dalliance',
  'dauntless', 'debacle', 'decorous', 'decry', 'deference', 'defray', 'deleterious', 'delineate', 'demagogue', 'demur',
  'denizen', 'denouement', 'deprecate', 'derelict', 'desiccate', 'desuetude', 'desultory', 'detritus', 'diaphanous', 'diatribe',
  'dichotomy', 'didactic', 'diffident', 'dilatory', 'dilettante', 'disabuse', 'discern', 'discomfit', 'disparate', 'dispassionate',
  'disputatious', 'disquiet', 'dissemble', 'disseminate', 'dissonance', 'distend', 'diurnal', 'divulge', 'doggerel', 'dolorous',
  'dour', 'draconian', 'dross', 'dulcimer', 'duplicity', 'ebullience', 'eclectic', 'edify', 'efface', 'effrontery',
  'egalitarian', 'egress', 'elegy', 'elide', 'elucidate', 'elysian', 'emaciate', 'embellish', 'eminence', 'emollient',
  'empirical', 'emulate', 'enclave', 'encomium', 'endemic', 'enervate', 'engender', 'enigma', 'enjoin', 'ennui',
  'enmity', 'entreat', 'ephemera', 'epicure', 'epigram', 'epistolary', 'epitome', 'equipoise', 'equivocate', 'errant',
  'ersatz', 'erstwhile', 'eschew', 'esoteric', 'espouse', 'estimable', 'estrange', 'ethereal', 'etymology', 'euphony',
  'evanescent', 'evince', 'exacting', 'exalt', 'exculpate', 'execrable', 'exegesis', 'exemplar', 'exhort', 'exigent',
  'exonerate', 'expatiate', 'expiate', 'explicate', 'expunge', 'extant', 'extemporise', 'extol', 'extraneous', 'extricate',
  'exuberant', 'fallacy', 'fallow', 'fastness', 'fathom', 'fatuous', 'fealty', 'feckless', 'fecund', 'feint',
  'felicitous', 'ferment', 'fervid', 'fetter', 'fickle', 'filial', 'finesse', 'flagrant', 'fledgling', 'florid',
  'flotsam', 'foible', 'foment', 'forbear', 'forbearance', 'foreboding', 'forestall', 'formidable', 'forswear', 'fractious',
  'frugal', 'fulminate', 'fulsome', 'furtive', 'fusillade', 'gainsay', 'gambit', 'garner', 'garrulous', 'gauche',
  'germane', 'gesticulate', 'glean', 'gloaming', 'glower', 'gormandise', 'grandiloquent', 'gratuitous', 'gravitas', 'gregariousness',
  'grisaille', 'guileless', 'gumption', 'hackneyed', 'haggard', 'halcyonic', 'hapless', 'harangue', 'harrow', 'haughty',
  'hauteur', 'hegemony', 'heretic', 'hermetic', 'heterodox', 'hidebound', 'hinterland', 'histrionic', 'hoary', 'homily',
  'hubris', 'husbandry', 'iconoclast', 'idiom', 'idyll', 'ignominy', 'illicit', 'imbroglio', 'immutable', 'impalpable',
  'impartial', 'impasse', 'impecunious', 'imperious', 'impervious', 'implacable', 'importune', 'impugn', 'impunity', 'inanimate',
  'incessant', 'inchoate', 'incisive', 'incongruous', 'incorrigible', 'inculcate', 'indefatigable', 'indelible', 'indigent', 'indolent',
  'ineffable', 'inexorable', 'infelicity', 'ingenuous', 'inimical', 'iniquity', 'innate', 'innocuous', 'inscrutable', 'insidious',
  'insipid', 'insouciance', 'insular', 'interlocutor', 'interregnum', 'intransigent', 'inure', 'invective', 'inveigh', 'inveterate',
  'invidious', 'irascible', 'irenic', 'itinerant', 'jejune', 'jettison', 'jocose', 'jocund', 'judicious', 'juncture',
  'junket', 'kismet', 'knell', 'laborious', 'lambent', 'lamentation', 'languor', 'largesse', 'lassitude', 'latent',
  'latitude', 'laudable', 'legerdemain', 'lethargy', 'levity', 'libation', 'licentious', 'limpid', 'lissom', 'litany',
  'loquacious', 'lucre', 'lugubrious', 'lummox', 'lupine', 'machination', 'maelstrom', 'magnanimity', 'maladroit', 'malaise',
  'malapropism', 'malediction', 'malinger', 'malleable', 'manifest', 'marginalia', 'martinet', 'maunder', 'maverick', 'mawkish',
  'maxim', 'meander', 'mendacious', 'mendicant', 'mercurial', 'meridian', 'mettle', 'miasma', 'mien', 'militate',
  'minatory', 'misanthrope', 'miscreant', 'misnomer', 'mitigate', 'modicum', 'modulate', 'mollify', 'monolith', 'moribund',
  'mordant', 'mores', 'morose', 'mote', 'munificent', 'muse', 'myriad', 'nebulous', 'nefarious', 'negligible',
  'neophyte', 'nettle', 'nexus', 'nicety', 'niggardly', 'nihilism', 'noisome', 'nomenclature', 'nonplussed', 'nostrum',
  'noxious', 'nugatory', 'obeisance', 'obfuscate', 'objurgate', 'oblation', 'obloquy', 'obsequious', 'obstinate', 'obtuse',
  'obviate', 'occlude', 'odious', 'officious', 'olfactory', 'ominous', 'onerous', 'opprobrium', 'opulence', 'oracular',
  'ordain', 'ornate', 'orotund', 'oscillate', 'ossify', 'ostentatious', 'otiose', 'overt', 'pablum', 'paean',
  'palatable', 'palliate', 'palpable', 'panacea', 'panegyric', 'paragon', 'paramount', 'pariah', 'parlance', 'paroxysm',
  'parsimony', 'pastiche', 'paucity', 'pecuniary', 'pedagogue', 'pedantic', 'pejorative', 'penchant', 'penitent', 'pensive',
  'penurious', 'peregrination', 'peremptory', 'perennial', 'perfidy', 'perfunctory', 'perilous', 'peripatetic', 'permeate', 'pernicious',
  'perquisite', 'personify', 'perspicuous', 'pertinacious', 'peruse', 'pervade', 'petulant', 'phalanx', 'philippic', 'phlegmatic',
  'piquant', 'pithy', 'pittance', 'placate', 'plaintive', 'platitude', 'plaudit', 'plenary', 'plenitude', 'plethora',
  'poignant', 'polemic', 'polity', 'ponderous', 'portend', 'portent', 'posit', 'potentate', 'pragmatic', 'prattle',
  'precarious', 'precept', 'precipitate', 'preclude', 'precocious', 'predilection', 'preeminent', 'prescient', 'presage', 'prevaricate',
  'primacy', 'probity', 'proclivity', 'prodigal', 'prodigious', 'profligate', 'profundity', 'progeny', 'prolific', 'promulgate',
  'propensity', 'propitious', 'prosaic', 'proscribe', 'protean', 'provident', 'proviso', 'prowess', 'proximate', 'puerile',
  'pugnacious', 'puissant', 'pulchritude', 'punctilious', 'pundit', 'purloin', 'purport', 'purvey', 'pusillanimous', 'putative',
  'quagmire', 'quell', 'querulous', 'quiddity', 'quiescence', 'quintessence', 'quiver', 'quotidian', 'raconteur', 'ramify',
  'rancour', 'rapacious', 'rapprochement', 'rarefied', 'recalcitrant', 'recant', 'recapitulate', 'reciprocal', 'recondite', 'recrimination',
  'rectitude', 'recumbent', 'redoubtable', 'redress', 'refractory', 'refulgent', 'refute', 'regale', 'regimen', 'relegate',
  'relinquish', 'remonstrate', 'renascent', 'renege', 'repartee', 'replete', 'reprisal', 'reproach', 'reprobate', 'repudiate',
  'requisite', 'rescind', 'resplendent', 'restive', 'reticent', 'reverent', 'rhapsodic', 'ribald', 'rife', 'rivulet',
  'rubicund', 'rudimentary', 'ruminate', 'sacrosanct', 'salubrious', 'salutary', 'sanction', 'sardonic', 'satiate', 'saturnine',
  'savant', 'schism', 'scintilla', 'scion', 'scrupulous', 'scurrilous', 'sedulous', 'seminal', 'sententious', 'sequester',
  'serried', 'servile', 'shibboleth', 'simulacrum', 'sinecure', 'singular', 'sinuous', 'slake', 'sobriquet', 'sodden',
  'solace', 'solicitous', 'soliloquy', 'solipsism', 'somnolent', 'sophistry', 'soporific', 'sordid', 'spartan', 'specious',
  'splenetic', 'sporadic', 'spurious', 'squalid', 'staid', 'stalwart', 'stasis', 'staunch', 'stentorian', 'stipulate',
  'stolid', 'stratagem', 'stricture', 'strident', 'stringent', 'stultify', 'stygian', 'suave', 'subjugate', 'sublime',
  'subsume', 'subterfuge', 'subvert', 'succinct', 'succour', 'sullen', 'sumptuous', 'sunder', 'supercilious', 'superfluous',
  'supine', 'supplant', 'supplicate', 'surfeit', 'surmise', 'surreptitious', 'susceptible', 'sycophant', 'synthesis', 'tableau',
  'tacit', 'tantamount', 'tautology', 'tawdry', 'temerity', 'temporal', 'tenable', 'tenet', 'tenuous', 'tepid',
  'terse', 'thrall', 'timorous', 'torpid', 'torpor', 'torrid', 'tortuous', 'tractable', 'traduce', 'transient',
  'transmute', 'travail', 'travesty', 'trenchant', 'trepidation', 'truculent', 'truncate', 'tumult', 'turbid', 'turgid',
  'turpitude', 'tutelary', 'unassailable', 'uncanny', 'unction', 'undulate', 'unequivocal', 'unfeigned', 'ungainly', 'untenable',
  'untoward', 'upbraid', 'urbane', 'usurp', 'vacillate', 'vacuous', 'vagary', 'vainglory', 'vanguard', 'vapid',
  'variegated', 'vaunt', 'vehement', 'venal', 'veneer', 'venerate', 'veracity', 'verbatim', 'verbose', 'verdure',
  'veridical', 'verisimilitude', 'vernacular', 'vertiginous', 'vex', 'vicissitude', 'vie', 'vigilant', 'vilify', 'vindicate',
  'virtuosity', 'viscous', 'visage', 'vitiate', 'vitriol', 'vituperate', 'vociferous', 'volition', 'voluble', 'voracious',
  'vortex', 'vouchsafe', 'wane', 'wanton', 'wary', 'waylay', 'welter', 'whet', 'whimsy', 'winnow',
  'winsomeness', 'wizened', 'wont', 'wraith', 'wrest', 'xenial', 'yeoman', 'zeal', 'zealot', 'zenithal',
  'zestful'
];

// The Publix weekly ad, by way of Flipp's aggregator, for the ZIP kept on the Groceries page. The flyer endpoint has
// every item (name, price, picture); the search endpoint has the deal wording (Buy 1 Get 1, save up to…) for most of
// them. The current week keeps every item; older weeks keep only their BOGO names, for the cycles. 26 weeks kept.
async function publix(getDoc, putDoc) {
  const g = await getDoc('groceries'); const zip = g && g.zip; if (!zip) return null;
  const H = { headers: { 'user-agent': 'Mozilla/5.0' } }, base = 'https://backflipp.wishabi.com/flipp';
  // accents are folded rather than dropped, so a jalapeño does not come through as a "jalapeo"
  const clean = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s*BOGO\*?/i, '').replace(/[^\x20-\x7E’]/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().replace(/[,;:\-–]+$/, '').trim();
  const saveOf = story => { const m = /save up to\s*\$?\s*([\d.]+)(\s*lb)?/i.exec(story || ''); return m ? `$${(+m[1]).toFixed(2).replace(/\.00$/, '')}${m[2] ? ' lb' : ''}` : undefined; };   // "SAVE UP TO 5.69" → "$5.69"
  const noteOf = story => { const t = String(story || '').replace(/^save up to\s*/i, '').trim(); return t && !/\d/.test(t) ? t.toLowerCase().replace(/^\w/, c => c.toUpperCase()) : undefined; };   // "SURPRISINGLY LOW PRICE" → "Surprisingly low price\"
  // deal wording, keyed by cleaned name, from two searches (each is capped at 150 items)
  const deals = {}; let flyerIds = {};
  for (const q of ['publix bogo', 'publix']) {
    const r = await fetch(`${base}/items/search?locale=en-us&postal_code=${encodeURIComponent(zip)}&q=${encodeURIComponent(q)}`, H); if (!r.ok) throw new Error('flipp ' + r.status);
    for (const i of (await r.json()).items || []) { if (i.merchant_name !== 'Publix') continue; flyerIds[i.flyer_id] = (flyerIds[i.flyer_id] || 0) + 1;
      const k = clean(i.name).toLowerCase(); deals[k] ??= { deal: i.pre_price_text || i.sale_story || i.post_price_text || '', story: i.sale_story || '', save: (i.sale_story || '').replace(/^save up to\s*/i, ''), price: i.current_price, img: i.clean_image_url }; }
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
    items.push({ name, bogo: bogo || undefined, price: multi ? undefined : price, deal: bogo ? undefined : wording(pre, price, dt.sale_story || d.deal), save: bogo ? saveOf(dt.sale_story || d.story) : undefined, note: noteOf(dt.sale_story || d.story), desc: dt.description ? String(dt.description).slice(0, 90) : undefined, img: (i.cutout_image_url || d.img || '').replace(/^http:/, 'https:') || undefined });
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
  const out = { date, word: null, quote: null }, errors = [];

  // counted from a fixed day rather than the day of the year, so a year does not bring the same words back on the same dates
  const since = Math.floor(Date.parse(date + 'T12:00:00Z') / 864e5) - 20400;
  const cap = t => t ? t[0].toUpperCase() + t.slice(1).replace(/\.?$/, '.') : '';
  const strip = t => String(t || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, '')
    .replace(/\.mw-parser-output[^}]*\}/g, '').replace(/\s+/g, ' ').replace(/\s+\.$/, '.').trim();   // Wiktionary ships a little CSS inside its definitions

  // the free dictionary first; Wiktionary when it is down, which it often is (522)
  const fromFreeDictionary = async w => {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
    if (!r.ok) throw new Error('dictionaryapi ' + r.status);
    const [e] = await r.json();
    const m = (e.meanings || []).find(m => m.definitions && m.definitions.length) || {};
    const d = (m.definitions || []).find(d => d.example) || (m.definitions || [])[0] || {};
    if (!d.definition) throw new Error('dictionaryapi no definition');
    return { w, pr: e.phonetic || (e.phonetics || []).map(p => p.text).find(Boolean) || '', pos: m.partOfSpeech || '', def: cap(d.definition), ex: cap(d.example) };
  };
  // Wiktionary's definitions endpoint has no pronunciation, so the page's own source is read for the IPA
  const wiktionarySound = async w => {
    try {
      const r = await fetch(`https://en.wiktionary.org/w/index.php?title=${w}&action=raw`, { headers: { 'user-agent': 'HQ personal dashboard' } });
      if (!r.ok) return '';
      const src = await r.text(), eng = src.slice(Math.max(0, src.indexOf('==English==')));
      const m = /\{\{IPA\|en\|([^}|]+)/.exec(eng);
      return m ? m[1].trim() : '';
    } catch { return ''; }
  };
  const exampleOf = d => {
    const p = (d.parsedExamples || [])[0];
    return strip((p && (p.example || p.text)) || (d.examples || [])[0] || '');
  };
  const fromWiktionary = async w => {
    const r = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${w}`, { headers: { 'user-agent': 'HQ personal dashboard' } });
    if (!r.ok) throw new Error('wiktionary ' + r.status);
    const en = (await r.json()).en || [];
    const usable = [];
    for (const m of en) for (const d of (m.definitions || [])) if (strip(d.definition).length > 12) usable.push({ m, d });
    if (!usable.length) throw new Error('wiktionary no definition');
    const best = usable.find(x => exampleOf(x.d)) || usable[0];   // a definition that brings a sentence with it wins
    return { w, pr: await wiktionarySound(w), pos: (best.m.partOfSpeech || '').toLowerCase(), def: cap(strip(best.d.definition)), ex: cap(exampleOf(best.d)) };
  };

  // a word that brings a sentence with it is worth more, so the first few tries hold out for one
  let plain = null;
  for (let attempt = 0; attempt < 6 && !out.word; attempt++) {
    const w = WORDS[(since + attempt * 137) % WORDS.length];
    for (const look of [fromFreeDictionary, fromWiktionary]) {
      try {
        const got = await look(w);
        if (got.ex || attempt >= 3) { out.word = got; break; }
        plain ||= got;
      } catch (e) { errors.push(e.message); }
    }
  }
  out.word ||= plain;
  // a day the dictionaries are all down keeps yesterday's word rather than dropping the page back to its built-in few
  if (!out.word) { const prev = await getDoc('daily'); if (prev && prev.word) { out.word = prev.word; out.wordFrom = prev.date; } }


  { const [q, a, w] = QUOTES[since % QUOTES.length]; out.quote = { q, a, w }; }   // counted the same way as the words

  let ad = null; try { ad = await publix(getDoc, putDoc); } catch (e) { errors.push('publix ' + e.message); }
  let px = null; try { px = await prices(getDoc, putDoc); } catch (e) { errors.push('prices ' + e.message); }

  await putDoc('daily', out);
  return { word: out.word ? out.word.w : null, quote: out.quote ? out.quote.a : null, bogos: ad ? ad.bogos : undefined, priced: px ? px.priced : undefined, worth: px ? px.worth : undefined, errors: errors.length ? errors.join('; ') : undefined };
});
