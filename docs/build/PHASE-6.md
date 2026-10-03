# Phase 6: Draw This Wall

**Branch:** `platform/draw-this-wall`. **Source:** Feature Expansion PRD §8 (DTW-FR-01–12). **Migration:** `0007_draw_this_wall.sql`. Merging it does **not** apply it: run it per `docs/SETUP.md` §2b.

An artist viewing a public fresco can draw the same place again as a new, independent fresco of their own, linked back to the one that prompted it.

## Decisions (2026-10-02, Jace)
| Question | Choice |
|---|---|
| Whose photo? | The responder's own new photo. The source is never drawn over or copied (DTW-FR-03/04). |
| Starting pin | The new photo's GPS; else the source's **public** pin; the artist can drag it either way. Never the source owner's exact point. |
| Source while drawing | A "Responding to" card at the top of the pinned-reference column; tap to enlarge. Never on the canvas. |
| Copy | Button **Draw it your way** (outlined, since the viewer's yellow is the slider thumb). Credit **Response to Ian's "Old City Hall"**. |
| Responses on the source | Yes: a **Responses** strip under Same Wall, because a neighbourhood-snapped response can land ~550 m away (DTW-FR-07). |
| Respond to your own fresco | Allowed (the same wall, a year later). |

## Tasks
1. **Schema (0007):** `frescoes.source_fresco_id` (FK, `on delete set null`, not-self check, partial index). Insert grant only, so the link can't be edited later. A restrictive insert policy allows a source only when it is public and unreported, or your own. Mirrored into `docs/schema.sql`; checks in `docs/schema.test.mjs`.
2. **Viewer `/f/:id`:** "Draw it your way" → `/new?from=<id>` on public, unreported frescoes. A credit line on responses, which degrades to "A response to a fresco that isn't shared any more." when the source can't be seen. A Responses strip (`FrescoStrip`, shared with Same Wall).
3. **Capture → Pin → Draw → Finish:** the source rides on the IndexedDB draft (`Draft.source`). Capture shows the card and skips the device-location prompt when the source pin can stand in. Pin check says "From the fresco you're responding to". Draw shows the card. Finish shows it and saves `source_fresco_id`.
4. **Race:** if the source is hidden while the artist draws, the database refuses the link (42501). Finish then saves without it and says so; the artwork is never stuck unsaved.

## Acceptance (PRD §8.6)
- [ ] A user can start a response from a public fresco.
- [ ] The response is stored as a distinct fresco; the source is unchanged.
- [ ] The response has a persistent source relationship, independent of distance.
- [ ] The response shows with the source (Responses strip) and, when close enough, in Same Wall.
- [ ] No exact GPS of the source owner is read or exposed.
- [ ] The response publishes with its own visibility and pin precision.
- [ ] Unpublishing or deleting the source doesn't delete the response; the credit degrades.
- [ ] RLS: you can't respond to a private or reported fresco that isn't yours, and you can't re-point the link after saving.

Stop and report.
