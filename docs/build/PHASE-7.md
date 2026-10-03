# Phase 7: Place History (the PRD's "Place Timeline")

**Branch:** `platform/place-timeline`, stacked on `platform/draw-this-wall` (Phase 6). **Source:** Feature Expansion PRD §9 (PT-FR-01–12). **Migration:** `0008_place_history.sql`. Merging it does **not** apply it: run it per `docs/SETUP.md` §2b, after 0007.

Every public fresco around a spot, newest first by when the place was seen, so a place can be read through the years.

## Decisions (2026-10-02, Jace)
| Question | Choice |
|---|---|
| What is a place? | A public point + **250 m** (`PLACE_RADIUS_M`). No `places` table yet. Same Wall stays 50 m. |
| Which date? | The photo's date (`captured_at`), else the day it was saved. Years computed in UTC by the database. |
| Compare | Pick two cards → **side by side**, earlier on the left; stacked on a phone. |
| "Add yours" | A new underdrawing whose pin starts at the place if the photo has no GPS. **Not** a response: "same place" and "response" stay distinct (PT-FR-06). |
| Entry points | Fresco viewer (under Same Wall), globe preview card, globe place search. |
| Copy | Link **Place history** · button **Add yours** · one fresco: **Only one fresco here so far.** · none: **No frescoes here yet.** |
| Default year | **All years**, grouped under year headings; chips filter one year. |

## Tasks
1. **Schema (0008):** `place_timeline(lng, lat, radius, year, before_seen, before_id, limit)` (keyset-paged, ≤ 100 rows, carries a public source's title/artist for responses) and `place_summary(lng, lat, radius)` (counts, earliest/latest, most common place name, years). Both `security invoker`, reading `public_location` only and filtering public + unreported explicitly. Uses the existing partial GiST index. Mirrored into `docs/schema.sql`; checks in `docs/schema.test.mjs`.
2. **Page `/place?lat=&lng=&name=`:** summary, Add yours (the one yellow), year chips, year shelves of cards (artist · date · response credit · Compare), side by side, Show more, loading/error/empty states. Lazy-loaded.
3. **Entry points:** "Place history" link in the viewer and preview card; a "Place history" button under the globe search after searching.
4. **Add yours:** `/new?lat=&lng=&name=`; capture uses the place as the pin fallback (`LocationSource 'place'`, Pin check: "From the place you chose").

## Acceptance (PRD §9.6)
- [ ] Public frescoes are grouped into a place timeline.
- [ ] The timeline is chronological and navigable by year.
- [ ] Two selected frescoes can be compared.
- [ ] Private and reported frescoes never appear, including the viewer's own.
- [ ] Location privacy is unchanged (public points only).
- [ ] Large timelines are paged, not downloaded whole.
- [ ] A new fresco can be started from the timeline.

Stop and report.
