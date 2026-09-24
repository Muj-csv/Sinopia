# Sinopia: Implementation Plan

**Deadline:** Oct 1, 11:45 pm "CST" (confirm timezone, D-003). **Target:** submitted by Oct 1 afternoon PHT. **Team:** assumed 4.

| Phase | Dates (PHT) | Goal | Exit gate |
|---|---|---|---|
| 0: Foundation + detection test | Sep 24 | Repo, CI; measure automatic detection on ~30 gesture sketches; confirm Openverse fields | Detection rate recorded → sets the default capture path (D-002) |
| 1: Pose signature | Sep 24–26 | `signature.py` + `signature.ts` + shared vectors + perturbation tests | Both languages pass the vectors within 0.01° |
| 2: Corpus + index | Sep 25–27 | Ingest ~2–3k license-filtered references with signatures; `stats.json`; content review | Index validates; 0 entries missing license/source; review done |
| 3: Capture + structural match | Sep 26–28 | Upload / camera / canvas, detection, joint editor, `match.ts`, families, results grid | Journeys 1–2 work on the deployed URL |
| 4: Evidence view + lock | Sep 28–29 | Side-by-side, overlay, region bars, largest differences, lock-a-relationship, license panel | Journey 3 works; the evidence view explains every number |
| 5: Supporting + submission | Sep 30–Oct 1 | Counter-check, evaluation page, polish, GIBC package | Submitted with all six required items |

**Owners (4 people):**
- **A:** Phase 0 detection test, then ingest (Phase 2).
- **B:** signature (Phase 1), then match + families (Phase 3).
- **C:** capture UI (Phase 3), then evidence view (Phase 4).
- **D:** Openverse probe, corpus content review, evaluation page, video + screenshots.

C can start the UI on day 2 with a handful of hand-made index entries.

## Traceability

| Goal | Requirements | Components | Phase | Verified by |
|---|---|---|---|---|
| G-1 sketch → signature | FR-001–003 | capture, signature | 0, 1, 3 | Vectors, detection rate |
| G-2 structural references | FR-004, FR-005, FR-007 | match, families | 3–4 | Perturbation + family tests |
| G-3 explain differences | FR-006, FR-009 | evidence, countercheck | 4–5 | Evidence view review, vectors |
| G-4 licensed references | FR-008, NFR-004 | ingest, license panel | 2, 4 | Schema check, manual review |

## Demo video (2–5 min, English)

1. A deliberately rough 20-second gesture sketch.
2. Upload: the skeleton appears; fix one joint.
3. The pose signature panel: "torso lean +17°, pelvis tilt −8°, weight on the right leg".
4. Gesture families: same gesture / same upper body / same lower body.
5. Evidence view: overlay; the pelvis is 11° off from real bodies doing this gesture.
6. Lock *torso + right arm*: references for the one part you were stuck on.
7. License + attribution; the one-line difference from pose-search tools.
