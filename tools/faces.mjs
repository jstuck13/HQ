// Sample payloads for the widget preview, built by the real face functions in api/glance.js rather than written
// out by hand — so what the preview draws is what the endpoint would actually send, including the empty and
// awkward states that are the whole reason for looking.
//   node tools/faces.mjs > tools/widget-faces.json
process.env.DATABASE_URL ||= 'postgres://nobody@localhost/none';   // _lib.js builds a client at import; never used
const { faceReading, glanceFrom } = await import('../api/glance.js');

const D = '2026-09-15';
const CATS = [{ id: 'cal', name: 'Appointments', tint: '#E9EEF3' }, { id: 'study', name: 'Study', tint: '#ECE6F3' },
              { id: 'fit', name: 'Training', tint: '#F6E6DC' }, { id: 'health', name: 'Health', tint: '#F5E4E6' }];
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
      cal: { cats: CATS, series: [
        { title: 'Study — Networking, chapter seven', date: D, start: 9, end: 11, cat: 'study' },
        { title: 'Call with advisor', date: D, start: 11.5, end: 12, cat: 'cal' },
        { title: 'Gym — pull day', date: D, start: 17, end: 18, cat: 'fit' }] },
      daily: { word: { w: 'obdurate', pos: 'adjective', def: 'Stubbornly refusing to change one’s opinion.' } },
    }, D, 10.3),
    'a packed day': glanceFrom({
      todo: { items: [{ text: 'Submit the lab report', at: 13 }, { text: 'Pick up prescription' }] },
      cal: { cats: CATS, series: [
        { title: 'Standup', date: D, start: 8.5, end: 9, cat: 'cal' },
        { title: 'Deep work — RPL value engine', date: D, start: 9, end: 11.5, cat: 'study' },
        { title: 'Lunch with Sam', date: D, start: 12, end: 13, cat: 'cal' },
        { title: 'Seminar', date: D, start: 13.5, end: 15, cat: 'study' },
        { title: 'Physio', date: D, start: 15.5, end: 16.25, cat: 'health' },
        { title: 'Gym — push day', date: D, start: 17, end: 18.5, cat: 'fit' }] },
      daily: {},
    }, D, 13.75),
    'an early start, a late finish': glanceFrom({
      todo: { items: [{ text: 'Pack', at: 21.5 }] },
      cal: { cats: CATS, series: [
        { title: 'Airport run', date: D, start: 6, end: 7.5, cat: 'cal' },
        { title: 'Evening lecture', date: D, start: 19, end: 21, cat: 'study' }] },
      daily: {},
    }, D, 7),
    'everything ticked': glanceFrom({
      todo: { items: [{ text: 'Laundry', done: true }, { text: 'Read', done: true }] },
      cal: { cats: CATS, series: [{ title: 'Dentist', date: D, start: 14, end: 14.75, cat: 'health' }] },
      daily: {},
    }, D, 16),
    'a clear day': glanceFrom({ todo: { items: [] }, cal: { series: [] }, daily: {} }, D, 10.45),
  },
};
console.log(JSON.stringify(out, null, 1));
