# Phase 4: Globe + fresco viewer

**When:** Sep 29–30. **Owners:** P4 (globe, viewer), P3 (slider), P6 + everyone (seeded frescoes).
**Goal:** explore the world through frescoes.
**Implements:** FR-009, FR-010, FR-011, FR-013, FR-014.

## Tasks
1. `src/globe/`: MapLibre globe; `rpc('globe_points')` → GeoJSON source with clustering; ink-style pins and clusters from the design brief; tap cluster → zoom; tap pin → preview card (thumbnail, title, artist, place) → Open. Photon place search. Deep link `/f/<id>`.
2. `src/viewer/`: composite + **Reality ↔ Drawing slider** (range input over photo and drawing layers; keyboard arrows ±5, Home/End); title, artist, place, date, caption, memory, tags; small map of the spot (public point only).
3. Same Wall: `rpc('same_wall', {p_fresco, p_radius_m: 50})` strip, nearest first; empty state per UX_MAP.
4. Report dialog (FR-013) for signed-in users on others' public frescoes.
5. Seed (FR-014): `scripts/seed.ts` with a dedicated seed account uploads ≥ 20 team-drawn frescoes across ≥ 5 cities (real photos the team took or openly licensed ones with attribution in the caption). Run once against production.
6. Performance: globe interactive ≤ 4 s on 4G; lazy-load the viewer route.

## Acceptance
- Globe shows the seeded frescoes; pin → viewer → slider → Same Wall works on phone and laptop.
- Reporting a fresco hides it for others immediately; the owner still sees it.
- Map attribution visible at all zoom levels.

## Don't touch
Schema (unless a migration + updated `schema.test.mjs`), drawing internals.

Stop and report with screenshots at 390 px and 1440 px.
