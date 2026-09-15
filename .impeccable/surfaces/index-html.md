---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["heroes/cc-classical.html"]
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
