# Phase 0: Foundation + detection test

**Goal:** scaffold the repo; measure how well automatic detection works on real gesture sketches; confirm the Openverse fields. This sets D-002 (default capture path). It doesn't block later phases.

## Tasks
1. Scaffold the layout from `CLAUDE.md`; CI running Vitest + pytest; `shared/rules.json` with the values from ARCHITECTURE §5–6.
2. `spike/detect.py`: run the Pose Landmarker (single-image mode) over `spike/sketches/` (~30 team sketches) with 4 preprocessing variants: raw; grayscale + contrast stretch; + line dilation; + light-gray fill. Record per image: detected, core joints with visibility ≥ 0.3, overlay PNG.
3. `spike/RESULTS.md`: detection rate per variant, the best variant, 3 annotated failures.
4. `spike/openverse_probe.py`: one filtered search (commercial + modification allowed, mature excluded, photographs). Save 5 raw results and list the real field names for license, version, creator, landing URL, thumbnail and provider.

## Acceptance
`spike/RESULTS.md` has numbers for all variants; the probe lists the real field names; CI green.

## Don't touch
Signature, matching, UI.

Stop and report the detection rates.
