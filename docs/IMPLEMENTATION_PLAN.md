# Sinopia: Implementation Plan

**Deadline:** Oct 1, 2026, 23:45 **UTC+8 / PHT** (official GIBC V2 rules). **Target:** submitted by **Oct 1, 15:00 PHT**. **Feature freeze:** Sep 30, 18:00 PHT. **Start:** Sun Sep 27 (PHT). **Team:** 6, all on Sinopia (D-004 resolved). **Budget:** $0.

| Phase | When (PHT) | Goal | Exit gate |
|---|---|---|---|
| 0: Foundation + spikes | **Sun Sep 27** | Repo scaffold, CI, Supabase project with `schema.sql` applied, OAuth, Vercel deploy, `/api/references` proxy, OpenFreeMap globe "hello", drawing-latency spike on a real phone | Deployed URL shows a globe; Google/GitHub sign-in works; RLS checks pass on the real project with two accounts; a stroke on a mid-range phone feels instant (≤ 16 ms/segment) |
| 1: Capture + draw | Sep 27–28 | FR-002, FR-003, FR-004 | Photo → pin → draw with layers/undo on a phone; draft survives a reload; uploaded-ready images have no EXIF |
| 2: References | Sep 28 (parallel with 1) | FR-005 | "fire hydrant" returns licensed results in ≤ 2 s inside the drawing screen; panel stays open while drawing |
| 3: Save, publish, Sketchbook | Sep 28–29 | FR-001, FR-006, FR-007, FR-008, FR-012 | Save private → appears in Sketchbook only; publish (neighborhood/exact) → public files + public point; unpublish removes both |
| 4: Globe + viewer | Sep 29–30 | FR-009, FR-010, FR-011, FR-013, FR-014 | Globe with ≥ 20 seeded frescoes; pin → viewer → slider → Same Wall; report hides a fresco |
| 5a: If time | Sep 30 until 18:00 | FR-015 street-level → FR-016 safety check → FR-017 weather | Each ships whole or not at all |
| 5b: Submission | Sep 30 18:00 → Oct 1 15:00 | Accessibility pass, 5 artist reactions, screenshots, video, README, Devpost | All six GIBC items present; fresh-browser test on a phone |

**Critical path:** Phase 0 → draw canvas (Phase 1) → save (Phase 3) → globe + viewer (Phase 4). References (Phase 2) run in parallel.

**Owners (6 people):**

| Person | Owns | Phases | Branch prefix |
|---|---|---|---|
| Ian (lead) | Supabase project, schema + privacy rules, save/publish/unpublish/delete, merges and deploys, final review of every PR | 0, 3 | `platform/` |
| P2 | Drawing canvas: Konva stage, layers, Perfect Freehand brush, eraser, colors, undo/redo, draft autosave, export | 1 | `canvas/` |
| P3 | Capture: camera/upload, EXIF GPS, location fallbacks, pin picker, Nominatim place name, image compression + EXIF stripping; then the Reality ↔ Drawing slider | 1, 4 | `capture/` |
| P4 | Globe and fresco viewer: MapLibre globe spike, clustering, preview card, Photon search, viewer layout, Same Wall; street-level view if time | 0 (spike), 4, 5a | `globe/` |
| P5 | References: `/api/references` proxy + reference panel; then the Sketchbook screens (grid, carousel, edit, publish toggle) | 0 (proxy), 2, 3 | `refs/` |
| P6 | Design and QA: app shell on `theme.css`, component states from `UX_MAP.md`, drawing the ~20 seeded frescoes, phone testing each night, 5 artist reactions, screenshots, video, Devpost | all, then 5b | `design/` |

**Cut order if behind** (cut from the top): weather → safety check → street-level view → angle chips → Photon place search → 3 layers (keep 1) → GitHub sign-in (keep Google). **Never cut:** capture + pin, drawing, reference panel, save private, publish, globe, viewer with slider, Same Wall, seeded frescoes, report.

## Daily rhythm
- 09:00 PHT stand-up (10 min): yesterday, today, blockers.
- 21:00 PHT: merge to `main`, deploy, one teammate runs the smoke path on a phone.

## Traceability

| Goal | Requirements | Components | Phase | Verified by |
|---|---|---|---|---|
| G-1 photo → drawing on a phone | FR-002–FR-004 | capture, draw | 1 | Phone test, Vitest (image pipeline, undo) |
| G-2 references for anything | FR-005, NFR-004 | references, `api/references` | 2 | Response mapping test, manual search set |
| G-3 place-bound, private or public | FR-001, FR-006–FR-008, FR-012, NFR-001 | frescoes, sketchbook, schema | 0, 3 | `schema.test.mjs`, real-project RLS check, Playwright smoke |
| G-4 explore the world | FR-009–FR-011, FR-013–FR-015 | globe, viewer | 4, 5a | Playwright smoke, seeded demo walkthrough |

## Demo video (2–5 min, English)

1. Cold open: spin the globe; frescoes across cities (seeded).
2. On a phone: photograph a street corner on campus; the pin drops.
3. Draw a creature and a fire hydrant; open **Reference**, search "fire hydrant", draw with it beside the canvas.
4. Finish: title, memory line, **Publish** with *neighborhood* precision (show the privacy choice).
5. Back on the globe: zoom to Angeles City, open the new fresco, drag the **Reality ↔ Drawing** slider.
6. **Same Wall:** a teammate's fresco of the same corner, same place, different eyes.
7. *(if built)* street-level view beside the fresco.
8. Sketchbook: private frescoes stay private.
9. One artist's reaction (with permission); the $0 open stack in one slide.
