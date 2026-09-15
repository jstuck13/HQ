---
version: 1
slug: "library-html"
primary_target: "library.html"
related_targets: ["index.html"]
---

# Surface: HQ home screen — hero exploration (5 directions)

Scope: first viewport of the HQ home screen (Operate mode). Five parallel directions requested by name: clean, friendly, minimal, techy, classical. Shared synthetic content across all five so they compare fairly. No concept roll: the five directions are user-pinned.

Audience/job: the owner, morning check-in. Task: know what today holds, what to do next, and where each area stands. Must feel welcoming, insightful, never nagging.

Content (synthetic, labeled): greeting; Monday 14 Sep 2026, 8:40; schedule of 6 items; a 5-item checklist; one status per area (finances, health, fitness, study, calendar); one insight sentence.

Constraints: static HTML/CSS/JS; each page self-contained except a shared icons.svg; desktop-first (1440) but must hold at 390.

## Direction contract

### 1 · Clean (heroes/clean.html)
THESIS: an airline-app calm — one accent, white cards on cool gray, the day as a vertical timeline with a live "now" line. Refuses the uniform card-grid of icon+number tiles.
OWN-WORLD: ground #F3F4F6, card white r20, ink #111827, accent cobalt #2B4FD8, semantic green/amber only for status. Figtree 400/600. Hairline dividers, 1px borders, soft offset shadow.
STORY: "Here's your day; everything else is fine or flagged."
FIRST VIEWPORT: top bar (HQ mark, date, search, avatar). Left 7/12: greeting h1, insight line, timeline 08:00–20:00 with blocks colored per area and a now-line. Right 5/12: checklist card, then a 2-col status list (area, number, delta). Primary action: "Add to today" button in the timeline header.
FORM: Swiss product UI; pinned by brief. Seed: none (pinned).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 2 · Friendly (heroes/friendly.html)
THESIS: a fridge-door planner — big rounded tiles, each area owns a color, the day drawn as a horizontal strip of colored blocks. Refuses gray neutrals.
OWN-WORLD: ground warm #FFF7EE, tiles r28 in tints: finance mint #CDEFD9, health coral #FFD3C9, fitness sky #CDE4FF, study lavender #E4D9FF, calendar butter #FFE8A3. Ink #2A2420. Gabarito 600 display, Nunito Sans body.
STORY: "Your day is a nice shape; here's what's next."
FIRST VIEWPORT: greeting h1 with weather-style chips (5 events, gym at 11:30, exam in 12 days). Full-width day strip 08–20 with blocks and a now marker. Below: five area tiles, uneven widths (finance wide), each with one number, one sentence, and a small check-in action. Primary action: "Start the day" button next to the greeting.
FORM: Planner/fridge magnet system; pinned. Seed: none.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 3 · Minimal (heroes/minimal.html)
THESIS: a typographic daybook — no cards, hairline rules, black on near-white, the next item set large. Refuses containers entirely.
OWN-WORLD: ground #FAFAF8, ink #141414, gray #6B6B66, one accent for "now": #E2531F. Schibsted Grotesk 400/500. 1px rules only.
STORY: "Next: gym at 11:30. Everything else in one glance below."
FIRST VIEWPORT: date top-left, tiny nav top-right. h1 = the next item at display size. Below, two columns: left the day as a plain list (time · item), right the five areas as a ruled list (name · number · note). Checklist as a plain list with square boxes at the bottom of the left column. Primary action: "+ Add" as a text button after the list.
FORM: Rams/Muji product typography; pinned. Seed: none.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 4 · Techy (heroes/techy.html)
THESIS: mission-control panels — dark, dense, mono data, amber phosphor accent (not green), a live clock and a ticker of area readings. Refuses the neon-green-glow default.
OWN-WORLD: ground #0E1116, panel #151A21 with 1px #2A3140 borders r6, ink #E6EAF0, amber #FFB000, cyan #48C8E8 second, red #FF5C5C. Chivo for UI, JetBrains Mono for data.
STORY: "All systems read; next event T-20m."
FIRST VIEWPORT: header strip with HQ, live clock, ticker of five area readings. Grid: schedule panel (left, list with T-minus), status panel (center, five rows with bars), checklist panel (right). Footer status line. Primary action: "Log entry" button in header.
FORM: control-room console; pinned. Seed: none.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 5 · Classical (heroes/classical.html)
THESIS: a leather-bound agenda — bottle-green masthead band over ivory paper, serif headings, ruled entries, tabular oldstyle numerals. Refuses the ivory-plus-serif-only rendition by committing the green band.
OWN-WORLD: band #1F3A2E, paper #F5F0E6, ink #1E1B16, rule #D8CFBF, accent oxblood #7A2E2B. Libre Caslon Text for headings, Libre Franklin for labels/data.
STORY: "Monday, 14 September. The day's appointments and the state of affairs."
FIRST VIEWPORT: masthead band: HQ wordmark, full date, greeting in serif italic. Paper below: left column "Appointments" as ruled ledger rows; right column "State of affairs" as five ruled rows with numbers right-aligned, then "To do" with checkboxes. Primary action: "New entry" text button in the band.
FORM: private ledger/agenda; pinned. Seed: none.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Round 2 — hybrids (techy dropped; user ranked clean > classical ≈ minimal)

### 6 · Clean-led (heroes/hybrid-clean.html)
THESIS: Clean's timeline and cool-gray ground stay; Minimal donates a "Next:" statement as the headline instead of a generic greeting; Classical donates a serif voice for that one headline. Fewer cards: the timeline is the only card, everything else sits on hairline rules directly on the ground.
OWN-WORLD: ground #F3F4F6, one white card r20, ink #111827, cobalt #2B4FD8. Figtree UI, Libre Caslon Text for the h1 only. Hairline lists, no second card.
FIRST VIEWPORT: top bar as Clean. Left 7/12: serif h1 "Next: deep work at 09:00 — in 20 minutes", one-line insight, timeline card. Right 5/12: checklist and areas as ruled lists with no card, section titles small.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 7 · Classical-led (heroes/hybrid-classical.html)
THESIS: the bottle-green masthead and ivory ledger stay; Clean donates the vertical hour timeline (redrawn in ink rules and paper tints); Minimal donates restraint — fewer descriptors, more air, one accent used once.
OWN-WORLD: band #1F3A2E (shorter), paper #F5F0E6, ink #1E1B16, rule #D3C9B6, oxblood #7A2E2B for "now" only. Libre Caslon Text headings, Libre Franklin body.
FIRST VIEWPORT: short band with wordmark, nav, date, serif greeting. Paper: left an hour-ruled timeline 08–20 with paper-tinted blocks and an oxblood now-line; right "State of affairs" ruled rows and "To do".
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 8 · Minimal-led (heroes/hybrid-minimal.html)
THESIS: no cards, hairlines, near-white; the "Next:" display headline stays. Clean donates a timeline, executed as a single horizontal hairline with tick marks and ink labels; Classical donates an italic serif for the greeting and insight line only.
OWN-WORLD: ground #FAFAF8, ink #141414, rule #DDDDD6, rust #BE3E13 for "now". Schibsted Grotesk; Libre Caslon Text italic for greeting/insight.
FIRST VIEWPORT: header rule; italic greeting; display "Next:" h1; a full-width hairline timeline with dots per event and a rust now-marker; below, two ruled columns: Today list + To do, and Areas.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Round 3 — clean-led × classical-led (minimal-led dropped)

### 9 · Clean × Classical, clean-leaning (heroes/cc-clean.html)
THESIS: Clean's gray ground, white timeline card, cobalt now-line and Figtree UI, with Classical's bottle-green masthead replacing the white top bar and Caslon carrying the headline and section titles.
OWN-WORLD: band #1F3A2E with italic serif date; ground #F3F4F6; card white r20 with soft shadow; ink #111827; cobalt #2B4FD8 for "now"; Figtree UI, Libre Caslon Text for h1/h2.
FIRST VIEWPORT: compact green band (wordmark, italic date, nav, New entry). Below: serif h1 with next item, insight line; left 7/12 timeline card; right 5/12 ruled lists titled in serif ("Checklist", "State of affairs").
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

### 10 · Clean × Classical, classical-leaning (heroes/cc-classical.html)
THESIS: Classical's green band, ivory paper, Caslon headings and oldstyle figures, with Clean's timeline as a white rounded card (soft shadow, area-tinted blocks, now-badge) and Figtree for UI text instead of Franklin.
OWN-WORLD: band #1F3A2E; paper #F5F0E6; card white r16; ink #1E1B16; oxblood #7A2E2B for "now"; area tints muted to sit on paper. Libre Caslon Text headings, Figtree body/labels.
FIRST VIEWPORT: green band with wordmark, italic date, nav, serif greeting + italic insight. Paper: left "The day" as a white card timeline with tinted blocks and an oxblood now-line badge; right "State of affairs" and "To do" ruled rows.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Decision (round 3)
User chose **10 · Classical-leaning** (heroes/cc-classical.html) as the first official design — explicitly "not the final design". Promoted to the app home at `index.html` (project root) with its own `icons.svg`. The heroes/ folder stays as the exploration archive. DESIGN.md is derived from index.html.

## Calendar page (calendar.html) — surface brief
Mode: Operate. Task: see the week, jump between weeks/months, filter by area, select a day to read its ledger, add/edit an entry inline (drawn states only for now). Content: appointments plus scheduled workouts and study blocks; money and health stay off this page.
Chosen composition (user brought back card 2 of hand 1 after a re-roll; seed key fc745a58): **Month picker over the week**.

### Direction contract — calendar.html
THESIS: a diary's month index above the week it opens to. The mini month is the wayfinder; the week is the big object; the selected day reads as a ledger beside it. Refuses the toolbar-dropdown calendar chrome.
OWN-WORLD: DESIGN.md as-is. Band, paper, one white card (the week timeline), ruled ledgers, serif headings, oldstyle figures, area tints, oxblood for now/today only.
STORY: "It's the week of the 14th; Wednesday is full, Thursday afternoon is free; here's what's on the day I clicked, and here's where I'd add something."
FIRST VIEWPORT: band with wordmark, month title in serif ("September 2026"), prev/next text arrows, Today, New entry. Paper in three columns: left rail (2/12) mini month with the current week tinted and today in oxblood, then area filters as checkbox rows; centre (7/12) the week card, seven day columns headed by serif day name + figure, hour rail 08–20, tinted blocks, today's column tinted and carrying the now-line; right (3/12) the selected day's serif heading, ledger rows (time · title · duration), then "Add entry" as an inline ruled form (title, day, start, end, area) with a text-button submit.
FORM: month-first week view; card 2 of the first hand; seed fc745a58.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Health page (health.html) — surface brief
Mode: Operate. Job: log today's numbers first (water, sleep, weight, resting HR, pills), read 30-day trends beneath. Tracks: sleep; water + nutrition; vitals (weight, resting HR, blood pressure occasionally); meds/vitamins as a daily checklist; appointments and refills as dated items. Chosen composition (seed 7f5dbb16, dealt card 2, user: "keep the middle"): **Today's ledger, then a strip of four trends**.

### Direction contract — health.html
THESIS: a daily log sheet with the month's graphs pinned along the bottom. The whole top is today, one wide ruled ledger with inputs inline; four small 30-day charts sit in a row beneath, all visible at once. Refuses the metric-tab single chart.
OWN-WORLD: DESIGN.md as-is. Band; paper; ruled ledger rows; serif numerals for today's values; the one white card is the water tally; charts drawn on paper with hairline axes, ink lines, oxblood only for today's point; no chart chrome.
STORY: "It's 8.40 am; log the morning numbers, tick the pills; the month says sleep is trending up and weight is flat."
FIRST VIEWPORT: band with 'Health' as the h1 and an italic 'logged 2 of 6 today'. Paper: 'Today' ledger full width — rows: Water (the white card: tally dots, plus/minus), Sleep (hours input + bed/wake), Weight, Resting heart rate, Blood pressure (occasional), each with last value and 30-day average; then 'Pills and vitamins' as a checkbox ledger in the same column; 'Next' (appointment/refill) as one ruled line. Below: 'Last 30 days' — four ruled charts side by side (Sleep, Water, Weight, Resting HR) with average and range figures, today's point in oxblood.
FORM: log-then-strip; card 2 of the dealt hand; seed 7f5dbb16.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Finances page (finances.html) — surface brief
Mode: Operate. Nav label "Finances" replaces "Accounts" on every page. Job: run a calendar-month budget — log paychecks/gigs as they land (variable income; an expected figure is only a plan), set a monthly limit per category, log expenses against categories, read three charts: cash left through the month, income vs expenses by month (6 months), spent vs limit by category. Chosen composition (seed 4e09a902, dealt card 3; user steer text truncated "Make more lat"): **Income page, expenses page**.

### Direction contract — finances.html
THESIS: a double-entry book lying open: money in on the left page, money out on the right, one gutter between; the charts run across both pages at the foot. Refuses the KPI-card dashboard.
OWN-WORLD: DESIGN.md as-is. Band; paper; ruled ledgers; serif numerals; ink bars for spent-vs-limit; oxblood for over-limit and due-today only; the one white card is the cash-left chart. Two-series chart uses Bottle Green (income) against Rule tan (expenses) with a legend.
STORY: "Two paychecks have landed, one is due Friday the 25th; rent goes Thursday; groceries are on pace; the electric bill is the only thing due today; you'll end the month about $900 ahead."
FIRST VIEWPORT: band: 'Finances', italic 'September · $2,140 left of $3,200 · 16 days to go'. Paper split 5/12 | 7/12 with a gutter rule. Left, 'Money in': expected $4,200 (editable), landed so far, next expected; paychecks as ruled rows (date · source · amount); 'Log a paycheck' inline line (source, amount, date). Right, 'Money out': categories as ruled rows (name · spent of limit · ink bar · left), limits editable inline, 'New category' line; then 'This month' log with an inline add line (what, amount, category, date) and transactions newest first, each removable. Foot, full width: cash-left card (day line to month end, rent and next paycheck marked), income vs expenses (6 paired bars), spent vs limit (horizontal bars).
FORM: double-entry spread; card 3 of the dealt hand; seed 4e09a902.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## School page (school.html) — surface brief
Mode: Operate. Nav label "School" replaces "Study" on every page. Job: know what to study next and why; see assignments/tests coming up; keep outside resources (links) per course; log study sessions; add/edit courses and items; tick items done. Priority = a mix of nearest due date, hours behind the weekly plan, and weakest confidence. Chosen composition (seed 668d2236, dealt lead; decision page closed, confirmed via the question tool): **Study-next card over course tiles**.

### Direction contract — school.html
THESIS: one recommendation, then the term. The page opens on the single white card — what to study now and the reason in plain words — and everything else is ruled paper: a tile per course, the due ledger, the session log. Refuses the tabbed course switcher.
OWN-WORLD: DESIGN.md as-is. Band; paper; one card ('Study next'); course tiles as ruled blocks on paper (no second card); checkbox ledgers; serif numerals for hours and confidence; study tint for the course marker; oxblood for due-today/overdue only.
STORY: "Networking first — the exam is in 12 days and you're 2 h behind plan; Stats problem set is due Thursday; Databases reading can wait but your confidence there is lowest."
FIRST VIEWPORT: band: 'School', italic 'Autumn term · 4 courses · exam in 12 days · 4 h of 8 h this week'. Paper: left 8/12 — the Study-next card (course, topic/item, the reason line, links for it, 'Start a session' with a running timer or a minutes input); then 'Courses' as a 2×2 grid of ruled tiles: name, hours this week of plan (plan editable), next due, confidence as five dots (click to set), links list with 'Add a link'. Right 4/12 — 'Due' ledger (date · item · course, checkbox; done items sink, overdue in oxblood) with an add line (item, course, date, type); 'Sessions' log (date · course · minutes) with an add line.
FORM: card over tiles; lead card of the dealt hand; seed 668d2236.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Library page (library.html) — surface brief
Mode: Operate (with an Experience lean: the covers are the delight). Nav "Training" is removed; "Library" takes its slot. Job: hold books read, to read, and reading now; click a book for its information; write as many notes as wanted per book. User steer on re-roll: "very visually appealing, implementing the covers of the books". Chosen (seed 82aadcb4, re-roll 1, dealt card 2): **Cover wall**.

### Direction contract — library.html
THESIS: covers are the page. The book being read sits large at the top inside the one white card with its details and notes; beneath, To read and Read are walls of covers with serif captions. Refuses the list-with-thumbnails.
OWN-WORLD: DESIGN.md as-is. Band; paper; one card (the open book); covers at 2:3 with a hairline edge and the system shadow only on the open book's cover; captions serif title / italic author; rating as five dots; notes as dated ruled entries; oxblood for the "reading now" marker only. Cover art from Open Library by ISBN; a drawn typographic cover (paper tint, serif title, italic author) when art is missing.
STORY: "Page 142 of Project Hail Mary; three notes so far; six waiting on the To-read wall; fourteen read this year."
FIRST VIEWPORT: band: 'Library', italic '1 reading · 6 to read · 14 read this year'. Paper: the open book card — cover ~200px left; right: title (serif 24), italic author, a details line (year · pages · genre), shelf actions as text buttons (Start reading / Finished / Back to To read / Remove), rating dots, description, page progress when reading; then 'Notes' — dated entries on rules and a 'Write a note' textarea with a text-button submit. Beneath: 'To read' — a row of covers (6 across) with captions and an 'Add a book' cover that opens an inline find-by-title-or-ISBN line (Open Library search, CORS-open); 'Read' — the wall of covers with captions and rating dots, most recently finished first.
FORM: cover wall; card 2 of the re-rolled hand; seed 82aadcb4.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
