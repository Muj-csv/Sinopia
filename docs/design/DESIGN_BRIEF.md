# Sinopia: Design Brief

**Status: Locked and in the build.** Anchor screen: Canvas / Studio · 2026-09-27, applied to `web/` 2026-09-28
Reads with: `UX_MAP.md` (what exists, and it wins on flows and copy) · `SCREENS.md` (per-screen layouts) · `TREND_SWEEP.md` (the evidence behind the forbidden list) · `COUNCIL_studio-v0.md` (the canvas critique whose fixes are logged below)

> **This file replaced the earlier plaster-and-ochre draft** when D-014 was revised on 2026-09-28. Values live in `tokens.json` and are exported to `theme.css` by `node scripts/tokens-export.mjs`; never hand-edit `theme.css`. Token slot names are the AEGIS ones (`--color-accent`, `--text-h2`), and the kit's own names (`--yellow`, `--ink`, `--paper`, `--r-ctl`) are emitted alongside them, so either spelling works in component CSS.

Every value below traces to one of these sources:
- **[you]** your answer in this session
- **[QD]** sampled from Quick, Draw!'s own files (`quickdraw.withgoogle.com/static/svg/sprite.svg` and computed page styles, read on 2026-09-27)
- **[PRD]** the product requirements
- **[sweep]** `TREND_SWEEP.md`
- **⚑ VP** a Veronica-proposed default for something nobody has decided yet. Overrule freely.

---

## 1. Personality

**The idea:** *Sinopia* is the sketch a painter draws before the paint goes on. So in this app, **the interface is the sketch, and the real world is the wall.** Photos stay untouched, real and full-bleed. Everything that belongs to the app (buttons, labels, pins, sheets) looks drawn in ink in a diary, with one yellow pencil for emphasis. This is load-bearing: it tells anyone on the team whether something should look "drawn" (app chrome) or "real" (photos and people's frescoes). **[you + PRD]**

**Should feel:** like the margins of a kid's diary: handwritten, a little cheeky, personal. It stays readable and orderly underneath, because the grid, the spacing and the long-text face are strict. That's the "lively but still formal" balance. **[you]**

**Should NOT feel:**
- Corporate or generic SaaS, glassy, or like "the AI tried to look tasteful" (the Fraunces-italic / cream / dark-amber looks). **[sweep]**
- A clone of Excalidraw (no rough.js wobble on everything, no Virgil font). **[sweep]**
- A copy of *Diary of a Wimpy Kid* or of *Quick, Draw!* itself. We borrow a *register* (the diary-doodle voice) and one *color*. We never borrow their characters, covers, title lettering, logo banner or illustrations. **[you, with the IP limit]**
- Like the team's FirstCommit entry. PRD D-004 requires the two entries to stay distinct, so no minimal monochrome / technical dot-matrix look here. **[PRD]**

---

## 2. Typography

Three faces, and each one has a job:

| Role | Face | Used for | Why |
|---|---|---|---|
| **Marker** (display) | **Gochi Hand** 400 | Screen titles, fresco titles, primary buttons, empty-state headlines | [you] picked Gaegu / Gochi. The loud marker scrawl carries the voice where it's biggest. |
| **Pencil** (annotation) | **Gaegu** 700 | Tool names, chips, nav labels, field labels, small notes ("on this device only") | [you] The soft pencil reads like margin notes. **⚑ VP: this marker/pencil split is my call on your "Gaegu / Gochi Hand" answer. It can collapse to Gochi only.** |
| **Print** (long text) | **Karla** 400 / 700 | Captions, "what I remember", license / creator / source lines, input text, errors, dates, coordinates | [you] "plain for long text." Karla is **Quick, Draw!'s own body face [QD]**, so it traces to your reference instead of defaulting to Inter. |

All three are OFL on Google Fonts ($0, NFR-003). Fallback stacks: `"Gochi Hand", "Comic Sans MS", cursive` · `"Gaegu", "Comic Sans MS", cursive` · `"Karla", system-ui, sans-serif`.

**The "Diary of a Wimpy Kid" font is not used.** The only downloadable version is a fan-made Calligraphr font with no stated license, which can't go into a public repo or a Devpost "Built With" list.

**Scale (phone first, each step ≥ 1.25×):**

| Token | Face | Size / line-height | Where |
|---|---|---|---|
| `display` | Gochi Hand | 36 / 40 | Globe search placeholder, empty-state headlines |
| `h1` | Gochi Hand | 28 / 32 | Screen titles, fresco title in the viewer |
| `h2` | Gochi Hand | 22 / 28 | Section titles (Same Wall, Sinopias), sheet titles |
| `button` | Gochi Hand | 20 / 24 | Primary and secondary buttons |
| `label` | Gaegu 700 | 19 / 24 | Tool names, chips, nav, field labels (Gaegu runs small, so 19 reads like 16) |
| `body` | Karla 400 | 16 / 24 | Caption, memory, form inputs (16 stops iOS from zooming inputs) |
| `small` | Karla 400 | 14 / 20 | License lines, dates, attribution, helper text |

Laptop: `display` 44, `h1` 32; everything else stays the same.
Rules: handwriting never below 17 px. No italics anywhere (the italic-word cliché **[sweep]**). No all-caps labels. Numbers and coordinates use Karla with `tabular-nums`, **not monospace** (monospace corner labels are a named tell **[sweep]**).

---

## 3. Color

**One signature color [you]: Quick, Draw! yellow. Everything else is ink and paper.**

| Token | Value | Role | Source |
|---|---|---|---|
| `--paper` | `#FFFFFF` | Sheets, forms, cards, lined areas | ⚑ VP (plain notebook white) |
| `--sea` | `#E4ECF3` | Globe and map water (added in Phase E) | ⚑ VP, a pale tint of the notebook rule |
| `--desk` | `#EDEFF2` | Behind paper: page ground, Studio letterbox around the photo | ⚑ VP, a cool neutral chosen so it isn't cream **[sweep]** |
| `--ink` | `#1A1A1A` | Text, 2 px outlines, icons | ⚑ VP ballpoint black (QD uses pure #000; slightly softened) |
| `--ink-2` | `#55595E` | Secondary text (7.05:1 on paper, 6.12:1 on desk) | ⚑ VP |
| `--rule` | `#CFDBE6` | Notebook lines. **Decorative only**, never a boundary (1.41:1) | ⚑ VP, notebook-rule blue-grey |
| `--yellow` | `#FFD139` | Signature fill | **[QD]** sprite.svg |
| `--yellow-edge` | `#E2B537` | Pressed edge / bottom lip of yellow buttons | **[QD]** |
| `--yellow-tint` | `#F9DD8F` | Selected rows, active chip background | **[QD]** |
| `--ok` | `#237636` | Success text or icon (5.65:1) | **[QD]** sprite green |
| `--error` | `#B3261E` | Error text or icon, red ballpoint (6.54:1) | ⚑ VP |

**Yellow rules (enforced, because yellow is easy to misuse):**
1. Yellow is **only ever a fill with ink on it** (11.96:1). It is never text and never a thin line on white (1.46:1, fails).
2. **Only one yellow button per screen**: the primary action.
3. Other allowed yellow: the active tool, the selected chip, the Reality ↔ Drawing slider thumb, globe clusters, and a highlighter stroke behind the current nav label.
4. There's no yellow framing around the photo or canvas. It would shift how artists see the photo's colors (genre reason **[sweep]**).
5. Warnings are ink text with a warning icon on `--yellow-tint`. **No colored left stripe** **[sweep]**.

**Theme:** light only, on purpose. It's paper. Dark mode is out of MVP scope. ⚑ VP

---

## 4. Paper

**Lined notebook paper [you]:** 1 px `--rule` lines at a **28 px pitch** on `--paper`.
- **Where:** Finish form, Sketchbook background, sheets (sign-in, report, pin preview card), empty states.
- **Never:** behind a photo, the canvas, the globe or the viewer image. Reality stays clean **[concept]**.
- **The detail only Sinopia has:** in Finish, the "what I remember" field uses a 28 px line-height so your typing sits *on* the notebook lines, like writing in a diary.

---

## 5. Spacing

Base unit 4. Scale: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64**. Nothing else.
Side gutter: 16 on phone, 24 on laptop. Touch targets ≥ 44 × 44 (NFR-006). Vertical rhythm inside lined areas snaps to 28 (7 × 4).

---

## 6. Geometry and edges

**One kind of edge: a 2 px ink outline.** There are **no blurred shadows anywhere** and **no `backdrop-filter` anywhere** (it costs FPS on mid-range Android, NFR-002 **[sweep]**).
- **Pressable things** (buttons, tool buttons, cluster pins) also get a **hard offset**: `0 4px 0` in `--yellow-edge` or ink. Pressing moves the element down 3 px. This is the chunky-button idea from Quick, Draw! **[QD]**, executed in our own shapes.
- **Radius per tier, slightly uneven** so it reads as hand-cut rather than a library default. It's plain CSS, no rough.js:
  - Buttons / chips / inputs: `10px 7px 9px 8px / 8px 9px 7px 10px`
  - Sheets: top corners `18px 14px`, bottom `0`
  - Photos and frescoes: `3px` (a printed photo, not a blob)
- There's no uniform 24 px+ rounding **[sweep]**.

---

## 7. Icons

**Doodle Icons** by Khushmeen Sidhu: 400+ hand-drawn icons under a **CC0** license (free commercial use, no attribution required). **[you: open hand-drawn set]**
- Ink color only, set at 24 px in 44 px targets.
- It's the **only** icon set. No mixing in Lucide or others. If a needed icon is missing (check layers, undo, redo and eraser first), a teammate draws it in the same style. That's cheaper than a second set and stays on-concept.
- There's no emoji and no sparkle icon anywhere. Sinopia uses no generative AI (PRD §11), so a sparkle would mislead people.

---

## 8. Density

- **Studio:** maximum canvas. Tools stay in the bottom third on phones. Chrome takes ≤ 20% of the height with the reference sheet closed, and ≤ 50% with it at half.
- **Forms and sheets:** airy. Handwriting needs room, and the 28 px lines set the pace.
- **Sketchbook:** medium. One carousel per group, thumbnails large enough to recognize the drawing (≥ 128 px). No bento **[sweep]**.

---

## 9. Motion (everything off or instant under reduced motion)

| Moment | Motion | Why it earns its place |
|---|---|---|
| Press any pressable | 3 px drop, 80 ms | Physical feedback on the most repeated action |
| Sheet detents | 200 ms snap | Shows where the sheet can rest |
| **Reality ↔ Drawing** | **Fade [you]**, driven directly by the slider with no easing | The paint going over the underdrawing, which is the concept itself |
| Globe fly-to on pin or cluster tap | 600 ms | Keeps your place on the planet |
| **Signature moment ⚑ VP:** after Publish | The new pin drops, and a hand-drawn ink circle scribbles around it (SVG stroke, 500 ms) | The one orchestrated moment: your drawing joins the world |

Banned: fade-in on scroll, hover scale, bounce, glow, idle globe spin **[sweep]**.

---

## 10. Components (taken from what the anchor screen and the demo actually use)

| Component | Spec | Used on |
|---|---|---|
| **Yellow button** `.btn-y` | Gochi 20, yellow fill, 2 px ink, `--r-ctl`, hard offset `0 4px 0 edge + ink`, drops 3 px when pressed. Disabled = paper with `--rule` border. **One per screen.** | Finish, Confirm spot, Open, Keep / Publish, Send report |
| **Paper button** `.btn-o` | Same shape, paper fill, ink offset | Everything secondary |
| **Danger button** | `.btn-o` with `--error` text, border and offset. Only inside a confirm sheet. | Delete, Unpublish |
| **Icon button** `.ibtn` | 44 × 44, no border, desk hover | Top bars |
| **Tool** `.tool` | 56 × 56, icon + Gaegu label. Active = yellow fill + ink border. Open popover = yellow tint. Optional ink count badge. | Canvas tray / rail |
| **Popover** `.pop` | Lined paper, 2 px ink, `--r-card`, ink offset. Focus moves in; Esc returns it. | Color, Size, Layers |
| **Sheet** `.sheet` | Lined paper, `--r-sheet`, bottom sheet on phone, centered card on laptop, scrim | Sign-in, Report, Confirm, Publish, Same spot, About |
| **Choice card** | Radio + Gochi title + Karla description. Checked = yellow tint + offset. | Who can see it, Pin precision |
| **Notice** | 2 px ink, yellow-tint fill, icon. Danger = paper + `--error`. **No side stripe.** | Errors, the exact-spot warning, the demo note |
| **Fresco card** `.card` | 3:4 thumbnail with 2 px ink and 3 px radius, Gochi title, Gaegu meta | Same Wall, Sketchbook shelves, Same-spot sheet |
| **Map pin** `.pin` | 44 px fresco thumbnail with 2 px ink and a 3 px offset. Your own pins get a yellow outline. | Globe |
| **Cluster** `.cluster` | 44 px yellow circle, 2 px ink, Gochi count. If it can't split (< 250 m), opens the Same-spot sheet. | Globe |
| **Reveal slider** | Native range. 6 px ink track, 30 px yellow thumb. "Reality" / "Drawing" labels in Gaegu. `aria-valuetext` says what's shown. | Viewer |
| **Segmented** `.seg` | Gaegu, selected = yellow | Sketchbook grouping |
| **Toast** | Paper, ink, offset, above the nav or tray | Every confirmation |

---

## Corrections from the rendered screens (Phase D → E)
1. **The reference sheet is part of the page on phones.** It pushes the canvas up instead of covering it (Council #1 and #2).
2. **Chips use `--r-ctl`**, not full pills (Council #4).
3. **The layer number is a badge on the icon**, so "Layer 1" no longer wraps (Council #3).
4. **Save status in the top bar**: "Draft kept on this device · 10:42", or a red message if saving fails (Council #6).
5. **Focus moves into popovers** and Esc returns it (Council #7). The size popover shows a live stroke preview (Council #8).
6. **The camera button is gone from the canvas.** The photo comes from Capture (Council, unnecessary).
7. **Sign-in happens at New**, not at save. The team UX_MAP wins over my earlier ⚑.
8. **Finish has one yellow button whose label follows the choice** ("Keep in Sketchbook" / "Publish to Globe"). This keeps Keep and Publish as equal choices without two yellow buttons.
9. **The globe is drawn in ink and paper** (paper land, `--sea` water, ink coasts, a faint graticule, a second hand-drawn pass on the outline). In the real build, style the OpenFreeMap / MapLibre layers with the same tokens.
10. Added `[hidden]{display:none!important}`, because component `display` rules were overriding `hidden`.

**Still open (your call):** one handwriting face or two (Gochi + Gaegu) · an eyedropper that picks colors from the photo (proposed, not in the PRD).

---

## 11. Forbidden list

**From the sweep:** indigo, purple or blue gradients · the Fraunces/Instrument-italic serif look · cream + sage/terracotta · Inter, Space Grotesk, Caveat, Indie Flower, Delius, Virgil/Excalifont · a pill badge above a title · monospace corner labels · colored left-stripe callouts · a hairline border + diffuse shadow · uniform 24 px+ radius · glassmorphism / `backdrop-filter` · a dotted globe with arcs, glow halo or auto-spin · stock teardrop pins and stock cluster bubbles · the before/after plugin handle (round knob with ◀ ▶ chevrons, "Before/After" pills) · bento Sketchbook · fade-on-scroll, hover scale, bounce · emoji or sparkle icons · "Unleash / Transform / Reimagined" copy · fake phone bezels in screenshots.

**Project-specific:**
- No *Wimpy Kid* characters, cover layouts or title lettering. No *Quick, Draw!* logo banner, hand illustration or copied button sprites.
- No lined paper or yellow behind or around photos, the canvas, the globe or the viewer image.
- More than one yellow button on a screen is banned.
- Handwriting fonts in long text (captions, memories, license lines) are banned.
- Seeded frescoes (FR-014) use real team drawings, real names and real captions. No placeholder artists.
- A second icon set is banned.

---
