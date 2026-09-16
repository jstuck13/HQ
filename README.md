# HQ

A personal dashboard for one person: calendar, finances, school, health, library, and a Today page
that reads all of them. Live at https://hq-six-puce.vercel.app.

## Pages

| Page | What it holds |
|---|---|
| `index.html` | The welcome cover: the day's quote and word, and the passcode gate. |
| `today.html` | The day's timeline, Now / Next, the weather, a morning report from the watch, the state of every area, and the day's to-do list (the only thing that lives here). |
| `calendar.html` | Week and month views, categories, repeats, per-occurrence notes, drag to move or resize. Google Calendar syncs in. |
| `finances.html` | One document per month: income, planned income, categories with limits and due days, transactions, three charts. |
| `school.html` | Courses, due items, study sessions and a timer, "study next" ranking. Canvas syncs in. |
| `health.html` | Sleep, weight, resting heart rate by day; pills; appointments; 30 / 90-day trends; streaks. Garmin syncs in. |
| `library.html` | Reading now, to read, read — with covers and details from Open Library, page progress, pace, notes. |
| `review.html` | The week: one row per area, against last week, with streaks and a sentence. Derived, never stored. |

Shared: `hq.css` (palette, band, headings, ornament, phone layout), `hq.js` (helpers, menu),
`clock.js` (dates in HQ's style, lamplight after 8 pm, motion), `store.js` (the data door),
`bell.js` (notices and sync status), `search.js` (search everything, `/`).

## How it works

Static HTML pages, no framework. Each page keeps its state as one JSON document (`calendar`,
`school`, `health`, `library`, `finances.2026-09`, `today.2026-09-16`, …) in a Neon Postgres
`documents` table, with localStorage as a cache so pages render instantly and work offline.
`store.js` is the only door: `store.load(key)` and `store.save(key, doc)`. Saves are debounced and
carry the `updated_at` they were based on; a newer copy on the server (another device, or a sync)
is refused with a 409, and the page takes the newer copy and says so.

Serverless routes on Vercel (`api/`):

- `login.js` — the passcode → a signed session cookie (90 days).
- `state.js` — GET / PUT a document. Keys beginning with `_` hold tokens and are never served.
- `sync/_run.js` — the runner: auth (cron secret or session), the `sync` ledger, `getDoc` / `putDoc`.
- `sync/canvas.js` — courses and planner items → School. `sync/google.js` — events → Calendar.
  `sync/garmin.js` — sleep, HR, weight, steps → Health (unofficial `garmin-connect`; MFA must be off).
  `sync/daily.js` — a word (Free Dictionary) and a quote (ZenQuotes) → `daily`.
  `sync/backup.js` — every document into a `backups` table, 30 days kept; GET `?day=` downloads one.
- `auth/google.js`, `auth/google-callback.js` — the one-time Google OAuth consent; the refresh token
  lands in `_google`.

Crons (`vercel.json`, UTC): daily 05:10, backup 09:00, google 10:30, canvas 11:00, garmin 12:00.
Each can also be run from the bell with "Sync now".

## Running it

- Vercel project linked to this repo; Neon attached from the Storage tab (injects `DATABASE_URL`).
- Environment variables (Settings → Environment Variables), all set by you, never in the repo:
  `PASSCODE`, `CRON_SECRET`, `CANVAS_URL` (or `CANVAS_LINK`) + `CANVAS_TOKEN`,
  `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, `GARMIN_EMAIL` + `GARMIN_PASSWORD`,
  `HQ_TZ` (optional, default `America/Chicago`). Redeploy after changing any.
- Deploy: `vercel --prod --yes`. Local static preview: `python -m http.server 8766` (pages run from
  the cache with no API; sign-in and syncs need Vercel).
- Installable: `manifest.json` and icons make it a home-screen app on the phone.

## Design

Bottle-green band, ivory paper, Libre Caslon for headings and numerals, Figtree for the rest.
Oxblood is an accent only. One card per page where a card is needed. Times are 12-hour with a dot
(8.40 am). After 8 pm the paper warms and the ink softens. `DESIGN.md` has the system; `PRODUCT.md`
the intent; `ROADMAP.md` what is left.
