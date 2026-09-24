# Phase 3: Capture + structural match

**Goal:** sketch in, matching references out, grouped into families.
**Implements:** FR-001, FR-002, FR-004, FR-005, NFR-001, NFR-002.

## Tasks
1. `src/capture/`: upload (PNG/JPG ≤ 10 MB), camera capture, in-browser canvas drawing; Phase 0's best preprocessing; detection in the browser; the default path per D-002.
2. Joint editor: 13 draggable joints over the sketch (also used for fully manual placement); keyboard movement (select joint, arrow keys).
3. `src/pose/match.ts`: region scores, overall weighted score, mirror, top 60 / top 24, reading `shared/rules.json`.
4. `src/pose/families.ts` per ARCHITECTURE §6.
5. Results screen: signature panel (plain-language values), family tabs with counts, results grid with license badges. Loading, empty and error states.
6. Deploy to a static host.

## Acceptance
- PRD journeys 1 (up to the results) and 2 work on the deployed URL in Chrome and Firefox.
- Search + families ≤ 1 s for the full index.
- Family unit tests pass.

## Don't touch
Evidence view, counter-check.

Stop and report.
