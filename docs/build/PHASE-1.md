# Phase 1: Pose signature

**Goal:** one pose signature, identical in Python and TypeScript.
**Implements:** FR-003, NFR-005.

## Tasks
1. `web/src/pose/signature.ts` and `ingest/signature.py` per ARCHITECTURE §3–4: 13-joint extraction from the 33 landmarks, y-up conversion, hip-origin + torso-length normalization, every feature in §4, missing-feature handling, `mirror()`.
2. `shared/test-vectors/signature/*.json`: at least 10 hand-made skeletons with expected features (e.g. right elbow at exactly 90°, pelvis tilted +10°, weight on the left ankle, lying figure).
3. Perturbation tests (ARCHITECTURE §12) and the mirror test, in both languages.

## Acceptance
Both languages pass every vector within 0.01°; perturbation tests change only the targeted feature and region.

## Don't touch
UI, ingest pipeline.

Stop and report.
