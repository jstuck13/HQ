---
name: HQ
description: A private morning agenda; bottle-green masthead over ivory paper, Caslon headings, one white timeline card, oxblood for "now".
colors:
  band: "#1F3A2E"
  band-ink: "#F2ECDF"
  band-muted: "#B9C9BE"
  oxblood: "#7A2E2B"
  paper: "#F5F0E6"
  card: "#FFFDF9"
  ink: "#1E1B16"
  ink-2: "#4D463C"
  ink-3: "#6A6256"
  rule: "#D3C9B6"
  area-calendar: "#E9EEF3"
  area-fitness: "#F6E6DC"
  area-health: "#F5E4E6"
  area-study: "#ECE6F3"
  chart-out: "#B9AE99"
typography:
  cover:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.3
  display:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.3
  display-mobile:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.3
  headline:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
  title:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "17px"
    fontWeight: 400
  numeral:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.1
  wordmark:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "0.14em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    letterSpacing: "0.04em"
  caption:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
  hour:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  check: "2px"
  badge: "6px"
  block: "10px"
  card: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "14px"
  lg: "20px"
  xl: "34px"
  gutter: "40px"
  column-gap: "64px"
  hour: "44px"
components:
  band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    padding: "16px 40px 22px"
  button-text:
    textColor: "{colors.band-ink}"
    typography: "{typography.label}"
    padding: "0"
  button-icon:
    textColor: "{colors.band-muted}"
    size: "16px"
  button-icon-hover:
    textColor: "{colors.band-ink}"
  nav-link:
    textColor: "{colors.band-muted}"
    typography: "{typography.label}"
  nav-link-current:
    textColor: "{colors.band-ink}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "18px 20px 20px"
  event-block:
    rounded: "{rounded.block}"
    padding: "6px 12px"
  now-badge:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.badge}"
    padding: "2px 8px"
  checkbox:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.check}"
    size: "15px"
  checkbox-checked:
    backgroundColor: "{colors.band}"
---

# Design System: HQ

## Overview

**Creative North Star: "The Morning Agenda"**

HQ is one person's private command center, and its first official design reads like a well-kept agenda opened at breakfast: a bottle-green masthead band across the top, ivory paper below, Caslon for anything that speaks (greeting, section titles, names, numbers) and Figtree for anything that merely informs (descriptions, labels, counts). The tone is welcoming and settled; nothing shouts, nothing gamifies. Numbers are set in oldstyle tabular figures so that "$2,140" and "3 of 8" sit in the text like words rather than readouts.

The one modern object on the page is the day itself: a single white, softly shadowed card holding an hour-ruled vertical timeline with area-tinted blocks and an oxblood "now" line. Everything else (the state of each area, the to-do list) sits directly on the paper as ruled ledger rows. Depth is spent once, on the timeline; the rest of the page is flat.

This is the incumbent world, chosen by the owner as "the first official design, not the final design". Later surfaces extend it (new areas, new screens) and may refine it; they should not silently trade the band, the paper, or the serif voice for something else without a decision.

**Key Characteristics:**
- Two materials, bottle-green band and ivory paper, with one white card as the only lifted surface.
- Serif speaks, sans informs: Libre Caslon Text for greeting, titles, names, numerals and hour marks; Figtree for body, labels and captions.
- Oldstyle tabular numerals on the whole document (`font-variant-numeric: oldstyle-nums tabular-nums`).
- One accent, oxblood, reserved for "now" and for flags that need the owner's attention.
- Hairline rules (1px, solid or dotted) structure lists instead of containers.
- Area tints are pale and paper-adjacent; they identify, they do not decorate.
- Motion is limited to a 150ms nudge on hover; reduced-motion removes it.

## Colors

Warm ivory and near-black ink under a deep bottle-green band, with a single oxblood accent and four barely-there area tints.

### Primary
- **Bottle Green** (`band`): the masthead band background, the checked-checkbox fill, and text selection. It is the one saturated surface; it does not appear as text or borders on the paper.
- **Band Ivory** (`band-ink`): text and icons on the band; also the text on the oxblood now-badge.
- **Band Sage** (`band-muted`): resting state for nav links, the italic date, and icon buttons on the band; they rise to Band Ivory on hover or when current.

### Secondary
- **Oxblood** (`oxblood`): the "now" line and badge on the timeline, flagged numerals and due labels in lists, and the focus-visible outline. It is the only warm accent and it always means attention.

### Tertiary
- **Calendar Mist** (`area-calendar`), **Fitness Peach** (`area-fitness`), **Health Rose** (`area-health`), **Study Lilac** (`area-study`): fills for timeline event blocks by area. Ink stays Ink on all four; the tint is identity, not contrast.

### Neutral
- **Paper** (`paper`): the page ground and the unchecked checkbox fill.
- **Card White** (`card`): the timeline card only; a warm off-white so it lifts from the paper without going clinical.
- **Ink** (`ink`): body text, headings, and the solid 1px underline beneath every h2.
- **Chart Out** (`chart-out`, #B9AE99): the second series in a two-series chart (money out beside Bottle Green money in); a warm mid-tan that reads against both paper and green and never carries text.
- **Ink 2** (`ink-2`): secondary descriptions in ledger rows and the checkbox border.
- **Ink 3** (`ink-3`): captions, counts, hour marks, completed to-dos, and the footer.
- **Rule** (`rule`): every hairline (ledger row dividers, dotted to-do dividers, hour rules).

### Named Rules
**The One Warm Accent Rule.** Oxblood is the only saturated warm color on the paper, and it is used only for "now", for flagged values, and for focus. A screen with nothing urgent has no oxblood on it.

**The Band Stays in the Band Rule.** Bottle green is a surface, not a text color. On paper it appears only as the checked-checkbox fill and the selection highlight.

## Typography

**Display Font:** Libre Caslon Text (with Georgia, serif)
**Body Font:** Figtree (with system-ui, sans-serif)

**Character:** A book serif for anything with a voice, a quiet humanist sans for everything that just labels. Caslon is used at regular weight only (700 exists for the wordmark and nothing else); its italic carries the date, the insight sentence and the footer. Figtree is loaded at 400/500/600 but the build uses only 400.

### Hierarchy
- **Display** (400, 32px, 1.3; 26px under 900px): the greeting h1 in the band, balanced and capped at 40ch, with the insight sentence in italic inside it.
- **Cover** (400, 40px, 1.3; 26px under 900px): the daily quote on the welcome cover (`welcome.html`), the one screen that is band-colour edge to edge; the only step above Display.
- **Headline** (400, 22px): section titles ("The day", "State of affairs", "To do"), underlined with a 1px Ink rule and carrying a right-aligned sans count at caption size.
- **Title** (400, 17px): area names in ledger rows. Event block titles use the same serif at 14.5px inside the timeline card.
- **Numeral** (400, 24px, 1.1): the one number per area, right-aligned, with a 12px sans unit line beneath.
- **Wordmark** (700, 20px, 0.14em tracking): "HQ" in the band; the only bold in the system.
- **Body** (400, 15px, 1.5): to-do labels and default text.
- **Label** (400, 13.5px, 0.04em): nav links and text buttons in the band; ledger row descriptions at the same size without tracking.
- **Caption** (400, 12.5px): section counts, event subtitles, to-do timing, and the footer (which switches to serif italic).
- **Hour** (400, 13px serif): hour marks down the timeline's left rail, right-aligned in a 42px column.

### Named Rules
**The Serif Speaks Rule.** If the owner would read the text aloud (greeting, a section's name, an area's name, its number, the hour) it is Caslon. If it only qualifies or counts, it is Figtree.

**The Oldstyle Figures Rule.** Numerals are oldstyle and tabular on the whole document; times are written with a full stop (8.40, 11.30), never a colon.

## Layout

A single 1180px content column, centered, with 40px side gutters. The band spans full width with the same inner column (16px top, 22px bottom padding); a hairline in 28%-alpha Band Ivory separates the toolbar row from the masthead greeting, 20px above and 18px below. Main content is a two-column grid, 1.1fr / 1fr, with a 64px gap and 34px top padding; the timeline lives left, ledgers right. Sections stack with 34px between them ("To do" beneath "State of affairs").

Vertical rhythm inside lists: ledger rows are 13px top and bottom on a solid hairline; to-do rows are 8px top and bottom on a dotted hairline; the card sits 14px beneath its h2. The timeline's unit is the hour, `--hour: 44px`, twelve hours tall (8.00 to 19.00); blocks are positioned at `hour × n + 9px` and sized `hour × duration − 4px` so they clear the rule above and below.

Below 900px the grid collapses to one column (36px gap, 20px gutters), the nav and date hide, the h1 drops to 26px, and the card tightens to 12px/10px padding.

## Elevation & Depth

Almost flat. The page is two tonal layers (band over paper) and one lifted object: the timeline card, which carries the system's single shadow at rest. Event blocks are flat tints inside that card and borrow the same shadow only on hover, together with a 2px nudge right. No other surface is raised; lists are held by hairlines.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 1px 2px rgba(30,27,22,.05), 0 6px 18px -6px rgba(30,27,22,.12)`): ink-tinted, soft, low; the timeline card at rest and event blocks on hover.

### Named Rules
**The One Card Rule.** Only the day's timeline earns a card and a shadow. Status, lists and to-dos sit on the paper on rules. A second card on a screen is a decision, not a default.

## Shapes

Gently rounded and quiet. The card is 16px; event blocks inside it are 10px; the now-badge is 6px; checkboxes are 2px squares. Nothing is a pill and nothing is sharp-cornered except hairlines. Borders are 1px hairlines in Rule (solid for ledgers, dotted for to-dos) or 1px Ink under section titles; the now-line is 1.5px oxblood. Icons are 16px, 24-unit stroke glyphs at 1.75 stroke width with round caps and joins, served from the shared `icons.svg` sprite.

## Components

### Buttons
- **Character:** words, not pills. Actions on the band are bare text with an icon; there is no filled button in the build.
- **Text button** (`button-text`): inline-flex, 16px icon and label with 8px gap, label typography, transparent 1px bottom border that becomes `currentColor` on hover (150ms).
- **Icon button** (`button-icon`): 16px glyph in Band Sage, rising to Band Ivory on hover; always carries an `aria-label`.
- **Focus:** 2px oxblood outline, 3px offset, on `:focus-visible` everywhere.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Card White on Paper.
- **Shadow Strategy:** Card lift at rest (see Elevation & Depth).
- **Border:** none.
- **Internal Padding:** 18px 20px 20px (12px 10px 14px under 900px); 14px margin beneath its section title.

### Inputs / Fields
- **Checkbox:** appearance removed; 15px square, 1px Ink 2 border, 2px radius, Paper fill. Checked: Bottle Green fill and border with a 7x4 Band Ivory tick drawn from a rotated border; the following label turns Ink 3 and strikes through.
- **Text inputs:** none in the build.

### Navigation
- **Style:** a single row of label-size links in the band, 20px apart, Band Sage at rest, Band Ivory on hover; the current page is Band Ivory with a 1px underline 2px below the text. Under 900px the row hides the nav and date and shows a menu icon button at the end of the actions; tapping it (`.band.nav-open`) folds the nav open as a wrapped row beneath the toolbar, above the masthead, separated by the band's 28%-alpha hairline.

### Timeline
A relative container `hour x 12` tall inside the card. Each hour is a flex row: a 42px right-aligned serif hour mark in Ink 3, then a 1px Rule line nudged 9px down to sit on the text baseline. Events are absolutely positioned anchors from 60px in, tinted per area, 10px radius, 6px 12px padding, 14.5px text with the title in serif and a 12.5px Ink 3 subtitle; hover nudges 2px right and lifts with the card shadow. The now-line is a 1.5px oxblood rule from 46px in, with a serif 12px time badge (oxblood fill, Band Ivory text, 6px radius) hanging above its right end.

### Ledger rows
Two-column grid rows on a solid Rule hairline: serif area name (17px) over a sans description (13.5px, Ink 2) on the left; a right-aligned serif numeral (24px) with a 12px sans unit line beneath on the right. A `flag` modifier turns the unit line oxblood.

### Section titles
Caslon 22px with a 1px Ink underline, 10px padding beneath, and a right-aligned sans caption count (12.5px, Ink 3) on the same baseline.

## Do's and Don'ts

### Do:
- **Do** keep the bottle-green band as the top of every screen, with the wordmark, italic serif date, nav and text actions inside the 1180px column.
- **Do** set every number in oldstyle tabular figures and write times with a full stop (8.40).
- **Do** put the day's timeline in the one white card, and everything else on Paper on hairlines.
- **Do** reserve oxblood for "now", flags, and focus; let a calm screen have none.
- **Do** tint event blocks by area with the four paper-adjacent tints and keep the text Ink.
- **Do** use the shared 16px stroke icons from `icons.svg` at 1.75 stroke width.

### Don't:
- **Don't** add filled or pill buttons; actions are text with an icon and a hover underline.
- **Don't** use Caslon bold anywhere but the wordmark, or Figtree above 500.
- **Don't** introduce a second accent or saturated area colors; the tints are identity, not status.
- **Don't** put cards around lists or status rows; the rule is the container.
- **Don't** use cool grays; every neutral is warm (ink-tinted shadows, ivory paper, tan rules).
