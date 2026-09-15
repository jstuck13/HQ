# HQ — where next

A working list, not a contract. Ordered roughly by how much each step unlocks. Integrations are the
through-line: HQ's value goes up with every source it can read without you typing.

## Where it stands (15 Sep 2026)

- Static pages on Vercel: welcome → today → calendar · finances · library · school · health.
- One document per page in Neon (`documents` table), localStorage as cache, one passcode.
- Everything you enter is yours; sample data is gone; each page can clear itself.
- Today derives from the other pages; nothing is typed twice.

## 1 · Foundation for integrations (do first)

Every integration below needs the same two things. Build them once.

- **A sync runner.** `api/sync/<source>.js` functions on a Vercel Cron schedule (or on demand from a
  "Sync now" text button). Each reads a token from env, calls the source, and *merges* into the
  right document — never replaces it — under a `source` tag on each imported record, so imported
  rows can be re-synced, marked stale, or removed without touching what you typed.
- **A sync ledger.** One `sync` document: per source, last run, last success, count imported, last
  error. Surface it as a quiet "Synced 8 min ago · Canvas, Google Calendar" line in the band's
  notifications bell (finally giving the bell a job).
- **Import rules per page.** Imported records get the source's id as a stable key so edits you make
  (a note on an assignment, a renamed category) survive the next sync.

## 2 · Integrations, in the order they pay off

| Page | Source | What lands | How | Effort |
|---|---|---|---|---|
| School | **Canvas LMS** | assignments, quizzes, discussions with due dates and submitted state; courses; module links | REST `/api/v1/planner/items`, `/courses`, `/modules`; personal access token in env | small — first one to build |
| Calendar | **Google Calendar** | events (read), and optionally push HQ entries back | OAuth once, refresh token in env; the connector already exists in this workspace | medium |
| Today | **Todoist** | the to-do list, two-way | REST + token; simplest of all | small |
| Health | **Fitbit / Garmin / Oura / Withings** (whichever you wear) | sleep, resting HR, weight, steps | OAuth; daily pull into `health.days` | medium |
| Health | **Apple Health** | same, if iPhone | no web API: an iOS Shortcut posting JSON to `/api/state` on a schedule | small once the endpoint accepts a source tag |
| Finances | **CSV import** | bank/card statements → transactions with auto-categories | drag a file onto the page; parse in the browser; remember merchant → category | small |
| Finances | **Plaid / Teller** | live transactions and balances | aggregator, monthly fee | large; later |
| Library | **Open Library** (done) + **Goodreads/StoryGraph export** | reading history | CSV import | small |
| Library | **Kindle highlights** | notes per book | `My Clippings.txt` import or Readwise API | small |
| Welcome | **Wordnik / quotes API** | a real word and quote of the day | fetch in a cron, cache in a document | tiny |
| Any | **Weather** | a line on Today ("15° and clearing") | Open-Meteo, no key | tiny |

## 3 · Pages that are missing

- **Training** (removed for now). Sessions logged (or synced from Strava/Hevy/Garmin), a plan per
  week, streaks. It feeds Today's second sentence and the Calendar's training category.
- **Money history.** Finances is one month per document; a year view (income vs expenses by month,
  category drift) reads across documents. Needs a `documents WHERE key LIKE 'finances.%'` route.
- **Search.** The band's search icon does nothing. One route that greps every document's text and
  returns page + snippet is enough.

## 4 · Make Today smarter

- Rollover: unfinished to-dos carry to the next day with a small "from yesterday" mark.
- Streaks and pace: "7 weeks of Monday gym", "on pace for 14 books this year" — derived, not stored.
- Weekly review page (Sunday): what got done, what slipped, one number per area for the week.
- Notifications with a purpose: due today, bill due, sync failed. Nothing else.

## 5 · Data layer growing pains (when they bite)

- **Conflicts.** Last write wins today. Add `updated_at` checks in `store.js`: refuse a PUT older
  than the server copy and re-merge. Matters once a phone and a laptop are both open.
- **History.** Health and Finances already key by day/month. Calendar, School and Library are single
  documents that will grow; fine for years at this size, but a split by year is the escape hatch.
- **Backups.** A nightly cron that writes every document to a dated JSON blob (Vercel Blob or the
  repo) — cheap insurance.
- **Auth.** A single passcode is right for one person. If you ever want a second reader, swap to a
  magic-link email (Resend + a signed token); the cookie shape stays.

## 6 · Small things worth doing

- A native month view on Calendar (the mini month is there; a full grid is a day's work).
- Drag to reorder categories and to-dos (the up/down buttons work; drag is nicer on desktop).
- Keyboard: `n` for new entry, `/` for search, `1–6` for pages.
- PWA manifest + icon so HQ installs on the phone's home screen and opens without browser chrome.
- Print stylesheet for the Calendar week and the Finances month.

## Suggested next three

1. Sync runner + ledger (section 1), proven with **Canvas** into School.
2. **PWA manifest** — five minutes, and HQ becomes an app on the phone.
3. **Training page**, so Today has all six areas back.
