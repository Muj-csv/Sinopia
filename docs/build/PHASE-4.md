# Phase 4: Evidence view + lock a relationship

**Goal:** the signature screen, where the drawing is compared with reality.
**Implements:** FR-006, FR-007, FR-008 (UI side).

## Tasks
1. `src/evidence/`: side by side sketch | reference; toggles Sketch / Skeleton / Photo / Overlay; overlay alignment (ARCHITECTURE §7) including the mirror case.
2. Region bars (8 regions) and "largest differences" (top 3 |Δ| in plain words).
3. Lock a relationship: select regions on the skeleton or from a list → re-run the search with only those regions weighted; show which regions are locked.
4. License panel: license + version, creator, source link, "Copy attribution"; the NFR-004 statement shown once in the footer/about.

## Acceptance
- PRD journey 3 works.
- Every number in the evidence view can be traced to a signature feature (spot-check 5 pairs by hand).
- Wording follows the rule in `CLAUDE.md`.

## Don't touch
Signature math (changes go through the vectors).

Stop and report.
