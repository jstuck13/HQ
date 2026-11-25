// Where a book's jacket comes from.
//
// Open Library serves a cover by its own id, or by ISBN when a book was added without one. `default=false`
// makes a missing cover a 404 rather than a grey placeholder, so a caller can tell and fall back to type —
// which the Library page and the reading widget both rely on, and which is exactly the kind of detail that
// goes wrong when the formula is written twice.
//
// An ES module so the server can import it; library.html loads it with type="module" and reads it off window.

export const coverURL = b => b.coverId ? `https://covers.openlibrary.org/b/id/${b.coverId}-L.jpg?default=false`
  : b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false` : null;

if (typeof window !== 'undefined') window.hqCover = { coverURL };
