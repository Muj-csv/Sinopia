# DESIGN_BRIEF — Sinopia

Status: Draft (HOLD on three load-bearing picks, D-014)
Updated: 2026-09-27 · Owner: Ian Patrick Flores and team · Values: `tokens.json` → exported to `theme.css`
Upstream: `docs/PRD.md` v1.0, `docs/ARCHITECTURE.md` v1.0 · UX: `UX_MAP.md` · Tier: Standard (≈ 4.5 days), team context

> **For teammates:** read `UX_MAP.md` → this file. Build against `theme.css` (generated from `tokens.json`; never hand-edit it). Three rules: (1) only theme tokens, no raw colors or stock palette classes; (2) every component state listed below exists; (3) run the checks before calling a screen done (ask Claude with AEGIS, or run the AEGIS scripts once copied into `tools/aegis/`).

> **Traces.** This file names tokens and gives the reason; values live only in `tokens.json`. Sources: **user** · **ref** · **team** · **delegated** · **aegis-default** (a gap nobody handed over; not yet confirmed) · **brief(from x)** (derived).

## 1. Anchor
- **Reference:** the product's name and the craft behind it. A *sinopia* is the red-ochre underdrawing on fresco plaster; a *fresco* is the finished wall. The app's world is the wall: plaster-grey ground, red-ochre for the artist's actions, the charcoal of *spolvero* (pounce dots used to transfer a design) for the map's ink. We don't take faux-antique textures, parchment, gold or ornament.
- **Borrowed from the First Commit brief:** the hand-made sketchbook warmth, ink-drawn pins, a globe that reads as an art object rather than a navigation tool, "one job per screen". **Not borrowed:** its cream/teal palette, which reads as the 2026 "tasteful default".
- **The one job (product level):** turn a real place into your drawing, then find it again on the Earth.

## 2. Personality
- **Should feel:** an artist's field kit: plaster, red chalk, charcoal, a pinned map. Quiet chrome, so the artwork is the loudest thing on every screen.
- **Should NOT feel:** Google Maps, Instagram, a travel app, a social feed (no likes, counts, stories rings, streaks), or an "AI art" tool (no gradients, sparkles or glow).

## 3. Layout intent
- **Skeleton:** the app opens on the **globe**, full-bleed, with a search pill at the top and a bottom bar (Globe · **New** · Sketchbook · Profile) where *New* is the one red primary action. **New** opens the camera/upload sheet straight away, then a full-screen **canvas**: the photo fills the screen, a compact tool rail sits on the side (left on phones in landscape, bottom on portrait), and the **reference panel** is a bottom sheet (phone) or right-hand panel (≥ md) that never covers more than 40% of the canvas. The **viewer** leads with the artwork and the slider, then the text, then Same Wall and the map.
- **Why not the default:** no landing hero, no feed of cards. The Earth is the gallery (discovery is geographic), and the canvas is the tool (drawing is the product). Artwork always gets the most pixels.
- Trace: aegis-default (derived from PRD §1, §7 and the First Commit brief's "one job per screen")

## 4. Typography
- **Families:** `font.display` = Source Serif 4 (wordmark, screen titles, fresco titles): it gives frescoes the dignity of a titled work. `font.body` = IBM Plex Sans (everything else): legible at small sizes on phones; `system-ui` fallback covers CJK place names.
- **Scale:** ratio 1.25 from 16 px body (`size.*`).
- Trace: aegis-default (both), load-bearing; confirm or replace (D-014). Self-host WOFF2 subsets.

## 5. Color
| Role (token) | Why it's this | Trace |
|---|---|---|
| `color.accent` (leads) | Sinopia red-ochre, deepened to pass 4.5:1: New, Publish, active nav, links | ref: named Sinopia color, deepened |
| `color.accent-2` | Pure named Sinopia: pins for public frescoes; the "drawing" end of the slider | ref |
| `color.accent-3` | Spolvero charcoal: cluster blots, the dotted Same Wall ring, the "reality" end of the slider, success | ref |
| `color.bg` · `surface` · `surface-hover` | Plaster greys; greyer and darker than the cream range | aegis-default · brief(from bg) |
| `color.surface-raised` | White frames around artwork, so the artist's colors read true | aegis-default |
| `color.text-primary` · `text-secondary` · `text-on-accent` | Lamp-black ink, readable secondary, white on red | aegis-default |
| `color.border` · `color.focus-ring` | Border 3:1 for inputs and handles; ink focus ring | aegis-default · brief(from text-primary) |
| `color.warning` · `color.danger` | Exact-spot warning, no-GPS notices · destructive actions only, always icon + text | aegis-default |

**The artist's palette is theirs.** Drawing colors are free; the UI never uses the accent inside the canvas area. Map tiles use OpenFreeMap "Positron" (light, low-chroma), recolored in the style JSON toward plaster/charcoal so the red pins lead.

Contrast evidence (`tokens_export.py --check`, 2026-09-27): 0 errors; text-primary/bg 13.1, text-secondary/bg 5.7, white/accent 6.6, accent/bg 5.0, border/bg 3.4, accent-2/bg 3.7 (UI), accent-3/bg 8.7. One warning: HOLD on unconfirmed `color.bg`, `font.display`, `font.body`.

## 6. Spacing, geometry, density
- Spacing: `space.*`, 4 px grid, 16 px phone gutter.
- Radius: `radius.control` 4 · `radius.card` 6 · `radius.sheet` 12 (bottom sheets). License chips are pills; everything else is near-square, like frames and panels.
- Density: loose around artwork, compact in toolbars. Tool rail icons 44 px targets.

## 7. Interaction character
- Motion: state feedback (`motion.fast`), sheets and panels (`motion.base`). Globe camera moves use MapLibre's `flyTo` with short durations; nothing animates on scroll. Honors reduced motion.
- **Signature move:** after publishing, the camera flies to your spot and your pin is *inked in* (`motion.draw`): the moment the drawing "is left on Earth".
- The Reality ↔ Drawing slider is the second signature: one gesture that says what the product is.

## 8. Forbidden list
- Cream + sage, purple/indigo, gradients behind text, glow, aurora blobs, satellite imagery as the default globe, dark "space" backdrops.
- Like buttons, follower counts, view counts, trending, streaks, badges.
- Landing hero, "Get started / Learn more" pairs, three-up feature cards.
- Emoji as icons; AI/sparkle iconography.
- Any reference thumbnail without its license chip; any map without attribution.
- UI chrome drawn over the artwork by default (toolbars never overlap the canvas center; the viewer's controls sit outside the image).

## 9. Deliberate choices
- allow: #CB410B — named Sinopia color, map pins and slider end only (ref: product name, 2026-09-27)
- allow: #2F3B4C — spolvero charcoal, clusters, Same Wall ring, success (ref: fresco practice, 2026-09-27)

## 10. Components
| Component | Variants | States | Tokens | Notes |
|---|---|---|---|---|
| Button | primary, secondary, ghost, danger | default · hover · focus-visible · active · disabled · loading | accent, accent-hover, text-on-accent, border, danger, radius.control, focus-ring | ≥ 44 px on touch |
| BottomNav | — | default · active · focus-visible | surface, accent, text-secondary | 4 items; *New* is primary |
| SearchPill | globe, references | idle · typing · loading · no-results | surface-raised, border | Photon (globe) / Openverse (references) |
| GlobeMap | — | loading · ready · tiles-failed | tokens mapped into the style JSON | Attribution always visible |
| Pin / ClusterBlot | own, others, selected | default · selected · focus | accent-2, accent-3 | Pins are keyboard-focusable markers with labels |
| PreviewCard | — | loading · default · broken-thumb | surface-raised, radius.card | Thumb, title, artist, place, Open |
| CaptureSheet | — | choose · reading-location · no-gps · denied | surface, warning | Camera / Upload / Drafts |
| PinPicker | — | default · dragging | accent-2, border | Mini-map with a draggable pin |
| Canvas | — | loading-photo · ready · drawing · saving-draft | surface-raised | Photo locked; 3 layers |
| ToolRail | brush, eraser, color, size, opacity, layers, undo, redo, reference | default · active · disabled | surface, accent, focus-ring | Labels on long-press / tooltips |
| ReferencePanel | sheet (phone), side (≥ md) | idle · loading · results · empty · error · rate-limited | surface, border, radius.sheet | Pin one reference; license footer |
| LicenseChip | — | default · focus-visible | surface-raised, border, text-secondary, caption | Opens source |
| FinishForm | — | editing · invalid · submitting | surface, danger | Limits mirror the database |
| PrecisionToggle | neighborhood, exact | default · selected | accent, warning | Exact shows a one-line warning |
| FrescoViewer | — | loading · ready · image-failed | surface-raised | Artwork first |
| RevealSlider | — | default · focus-visible · dragging | accent-2 (drawing end), accent-3 (reality end), focus-ring | Native range input; arrows ±5, Home/End |
| SameWallStrip | — | loading · items · empty | surface, accent-3 | Nearest first, up to 24 |
| StreetViewPanel *(if time)* | mapillary, panoramax | loading · ready · none · hidden-for-neighborhood | surface | CC BY-SA credit |
| SketchbookGrid | grid, carousel | loading · empty · items | surface, radius.card | Group by place or month |
| Dialog | report, delete, unpublish | open · submitting · done | surface, danger | Focus-trapped |
| Toast / Notice | info, warning, danger, success | default | warning, danger, accent-3 | Icon + text |

Library: none; plain React components on CSS variables. MapLibre and Konva are styled through tokens mapped in code (`src/lib/tokens.ts` reads the CSS variables).

## 11. Responsive & accessibility
- Mobile-first (most frescoes start on a phone). < md: bottom nav, bottom sheets, full-screen canvas. ≥ md: side reference panel, viewer side-by-side (artwork | details), Sketchbook grid; ≥ lg: 4-column Sketchbook.
- WCAG 2.2 AA: contrast (checked), visible ink focus ring, 44 px targets, keyboard path for every flow (the canvas supports keyboard undo/redo and tool switching; drawing itself is pointer-based, and the fresco's text content is fully keyboard-accessible), alt text = fresco title + place, reduced motion.

## 12. Log
- Carried over from the earlier Sinopia direction: plaster/sinopia/spolvero palette and type pairing (they fit the fresco metaphor better now).
- Lint 2026-09-26: cream `surface` + green `success` flagged as cream+sage → changed to #EDEBE7 and charcoal.
- Explored & rejected: First Commit's cream/teal/terracotta; dark space globe; satellite basemap (competes with the artwork, and it's not free without a key).
- Open questions for AERIAL: typical Mapillary coverage in the demo cities (decides whether street view is worth the Phase 5a slot).
- **Picked for you (HOLD until confirmed, D-014):** `color.bg` plaster `#E4E1DB` · `font.display` Source Serif 4 · `font.body` IBM Plex Sans.
