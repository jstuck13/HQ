# HQ — where next

A working list, not a contract. Most of the original roadmap is built; this is what remains and
what was set aside on purpose.

## Where it stands (16 Sep 2026)

- Seven pages plus the welcome cover, sharing `hq.css` / `hq.js`; one document per page in Neon,
  localStorage as cache, one passcode, conflict-safe saves.
- Integrations running on crons: Canvas → School, Google Calendar → Calendar, Garmin → Health,
  a fetched word and quote → welcome, a nightly backup of every document.
- Today derives from every other page: timeline with a now line, Now / Next, weather, the morning
  report, the state of each area, a smarter greeting, timed to-dos, rollover.
- The bell: to-dos (tickable), what is due, sync status. Search across everything (`/`).
- The week: a review page, one row per area against last week, streaks, a sentence.
- Design: lamplight after 8 pm, restrained motion, empty-state ornament, month grid, drag on the
  calendar, streaks, reading pace, 30 / 90-day trends.

## Left to do

- **Finances year view.** Income vs expenses by month across the year, category drift, savings
  rate. Reads across `finances.*` documents; needs a route that lists keys. Worth it once a couple
  of months of real transactions exist.
- **Print stylesheet.** The Calendar week and the Finances month onto one sheet, ink only.
- **Small ones noticed in use:** a "same as yesterday" weight shortcut on Health; a bell notice for
  an exam within two days with nothing studied; the Read shelf grouped by year once it is long.

## Set aside, on purpose

- **Training page** (from Garmin activities) — skipped for now; the activity data is one call
  away in `garmin-connect` (`getActivities`) when wanted.
- **Bank CSV / Plaid → Finances** — skipped for now; the merchant → category memory is the only
  design question.
- **Keyboard shortcuts** — not wanted.
- **Google Calendar write-back** — only worth it if planning moves from Google into HQ.
- **Todoist, Apple Health, Kindle highlights, Goodreads import** — each a small sync in the same
  runner pattern (`api/sync/<source>.js`, tagged records, an `ignored` list, a line in the bell) if
  ever wanted.

## Growing pains, when they bite

- Calendar, School and Library are single documents; fine for years at this size. A split by
  year is the escape hatch.
- The `garmin-connect` library is unofficial; if Garmin changes its login, the Health sync fails
  visibly in the bell and hand entry keeps working.
- The word and quote APIs are free and occasionally down; the welcome page falls back to its own
  rotation on those days.
- A second reader would mean swapping the passcode for a magic-link sign-in; the cookie shape stays.
