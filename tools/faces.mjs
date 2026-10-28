// Sample payloads for the widget preview, built by the real face functions in api/glance.js rather than written
// out by hand — so what the preview draws is what the endpoint would actually send, including the empty and
// awkward states that are the whole reason for looking.
//   node tools/faces.mjs > tools/widget-faces.json
process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; never used
const { faceReading, glanceFrom } = await import('../api/glance.js');

const D = '2026-09-15';
const book = (o = {}) => ({ books: [Object.assign({
  id: 1, shelf: 'reading', title: 'Project Hail Mary', author: 'Andy Weir', pages: 476, page: 180, isbn: '9780593135204',
  log: { '2026-09-09': 40, '2026-09-12': 90, '2026-09-14': 140, '2026-09-15': 180 },
}, o)] });

const out = {
  reading: {
    'mid-book, logged today': faceReading(book(), D),
    'nothing logged today':   faceReading(book({ log: { '2026-09-09': 40, '2026-09-12': 90, '2026-09-14': 140 }, page: 140 }), D),
    'no reading this week':   faceReading(book({ log: { '2026-08-20': 40, '2026-08-22': 180 }, page: 180 }), D),
    'nearly finished':        faceReading(book({ page: 470 }), D),
    'finished':               faceReading(book({ page: 476 }), D),
    'a long title':           faceReading(book({ title: 'The Making of the Atomic Bomb', author: 'Richard Rhodes', page: 312, isbn: '9781451677614' }), D),
    'no page count':          faceReading(book({ title: 'Meditations', author: 'Marcus Aurelius', pages: 0, page: 0, log: {}, isbn: '' }), D),
    'nothing on the go':      faceReading({ books: [{ shelf: 'read', title: 'x' }] }, D),
  },
  day: {
    'a working morning': glanceFrom({
      todo: { items: [
        { text: 'Cadence practice', at: 7.5 }, { text: 'Call the dentist', at: 9.5 },
        { text: 'Load of laundry', from: '2026-09-13' }, { text: 'Declare SCM minor', due: '2026-09-18' },
        { text: 'Read twenty pages', done: true }, { text: 'Review the PR', at: 16 }] },
      cal: { series: [
        { title: 'Study — Networking, chapter seven', date: D, start: 9, end: 10.5 },
        { title: 'Call with advisor', date: D, start: 11, end: 11.5 }] },
      daily: { word: { w: 'obdurate', pos: 'adjective', def: 'Stubbornly refusing to change one’s opinion.' } },
    }, D, 10.45),
    'a clear day': glanceFrom({ todo: { items: [] }, cal: { series: [] }, daily: {} }, D, 10.45),
  },
};
console.log(JSON.stringify(out, null, 1));
