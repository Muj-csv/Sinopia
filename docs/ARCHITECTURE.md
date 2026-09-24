# Sinopia: Architecture

## 1. Overview

Sinopia has two parts that never talk to each other at runtime:

1. **Ingest (offline, run by the team):** a Python script fetches openly licensed photos of people from Openverse, detects joints, computes each photo's **pose signature**, and writes a static index plus corpus statistics. It stores numbers and links only, never images.
2. **App (static website):** reads a sketch, detects or lets the user place joints, computes the same signature in TypeScript, compares it against the index region by region, groups the results into gesture families, and renders the evidence view. Thumbnails load straight from their source hosts.

No backend, no database, no accounts.

```mermaid
flowchart LR
  subgraph Ingest["Offline ingest"]
    OV[(Openverse API)] --> I[ingest.py\nlicense + mature filter\nMediaPipe → joints → signature]
    I --> IDX[index.json + stats.json]
  end
  IDX --> APP
  subgraph Browser["User's browser"]
    APP[Static app] --> MP[MediaPipe Pose\n(WASM)]
    APP --> SIG[signature.ts]
    SIG --> MATCH[match.ts\nregions · mirror · lock]
    MATCH --> FAM[families.ts]
    MATCH --> EV[Evidence view]
  end
  U((Learner)) -->|sketch| APP
  APP -->|thumbnails| H[(Source image hosts)]
```

## 2. Components

| Component | Responsibility | Justifies |
|---|---|---|
| `ingest/ingest.py` | Query Openverse (license + mature filters), detect joints, keep single-person images with ≥ 9 visible core joints, compute signatures, write index + stats | FR-008, NFR-004 |
| `ingest/signature.py` + `web/src/pose/signature.ts` | Pose signature, identical in both languages | FR-003, NFR-005 |
| `shared/test-vectors/` | Joint sets → expected signatures and region scores | NFR-005 |
| `web/src/capture/` | Upload, camera, canvas drawing; preprocessing; detection; joint editor with sketch background | FR-001–002 |
| `web/src/pose/match.ts` | Region scores, mirror handling, locked regions, top-K | FR-004, FR-007 |
| `web/src/pose/families.ts` | Group candidates into gesture families | FR-005 |
| `web/src/evidence/` | Side-by-side view, overlay alignment, region bars, largest differences | FR-006 |
| `web/src/pose/countercheck.ts` | Percentile checks against `stats.json` | FR-009 |
| `web/src/eval/` | Evaluation page | FR-010 |

## 3. Joints and normalization

- **Core joints (13):** nose, L/R shoulder, L/R elbow, L/R wrist, L/R hip, L/R knee, L/R ankle. Hands, feet and face detail are ignored (too noisy on sketches).
- **Coordinates:** image coordinates converted to y-up. Origin at the hip midpoint; scale by torso length (hip midpoint → shoulder midpoint). **No rotation normalization**: a lying figure must not match a standing one.
- **Visibility:** joints with visibility < 0.3 are treated as missing; any feature that uses a missing joint is missing too.

## 4. Pose signature

All angles are in degrees, measured from the positive x-axis (or from vertical where stated), with differences computed on the circle (−180°…180°).

| Group | Features |
|---|---|
| Torso | `torso_lean` (hip-mid → shoulder-mid vs vertical), `head_offset` (nose relative to shoulder-mid, / torso length, x and y) |
| Shoulders | `shoulder_tilt` (L→R shoulder line vs horizontal) |
| Pelvis | `pelvis_tilt` (L→R hip line vs horizontal), `tilt_contrast` = shoulder_tilt − pelvis_tilt (contrapposto) |
| Arms | segment angles: upper arm L/R (shoulder → elbow), forearm L/R (elbow → wrist); bends: elbow L/R (interior angle) |
| Legs | segment angles: thigh L/R (hip → knee), shin L/R (knee → ankle); bends: knee L/R |
| Ratios | apparent lengths / torso length for the 8 segments (labelled *apparent*: 2D, affected by foreshortening) |
| Gesture | `balance_offset` (horizontal offset of the shoulder-hip centre from the ankle midpoint, / torso length), `weight_side` (the ankle nearer to under the centre and lower in the frame; L / R / even), `line_of_action` (angle from the support ankle to the nose), `curvature` (signed distance of the hip midpoint from that line, / torso length) |

**Mirror:** swap L/R labels and negate x-dependent angles. Matching scores both the original and the mirror and keeps the better one (toggle, default on).

## 5. Structural match

- **Regions and features:**
  - Torso: `torso_lean`, `head_offset`
  - Shoulders: `shoulder_tilt`
  - Pelvis: `pelvis_tilt`, `tilt_contrast`
  - Left / Right arm: segment angles + elbow bend
  - Left / Right leg: segment angles + knee bend
  - Gesture: `line_of_action`, `curvature`, `balance_offset`
- **Region similarity (0–100):** `100 × max(0, 1 − mean(|Δ| / tolerance))`, with tolerance 45° for angles and 0.5 for normalized distances. Missing features are skipped; a region with no usable features is excluded.
- **Overall:** weighted mean of the available regions (default weights: Gesture 2, Torso 1.5, Pelvis 1.5, Shoulders 1, each limb 1). Ratios get weight 0.25, inside their limb.
- **Locked regions (FR-007):** only the selected regions count; all others get weight 0.
- **Ranking:** a linear scan over the index, then a partial sort for the top 60 (families) and top 24 (grid). Around 3,000 entries × ~30 features stays well under 50 ms.

These formulas are simple on purpose, so every number shown in the evidence view can be explained. All tolerances and weights live in `shared/rules.json`.

## 6. Gesture families (FR-005)

From the top 60 by overall score:
- **Same gesture:** every available region ≥ 80.
- **Same upper body:** Torso, Shoulders and both arms ≥ 80, and at least one leg < 70.
- **Same lower body:** Pelvis and both legs ≥ 80, and at least one arm < 70.

A reference can appear in only one family, in that order. The rest stay under "Related".

## 7. Evidence view (FR-006)

- **Overlay:** translate the reference skeleton so its hip midpoint sits on the sketch's hip midpoint, then scale it by the ratio of torso lengths. Mirror it too if the mirrored version matched.
- **Region bars:** the region scores for this pair.
- **Largest differences:** the 3 features with the biggest |Δ|, written as "Pelvis tilt: yours −8°, reference +3° (11° apart)".
- **Toggles:** Sketch / Skeleton / Photo / Overlay.
- **Wording:** "pose geometry similarity" and "difference from this reference".

## 8. Corpus, licensing and content

- **Openverse query:** image search with commercial-use and modification allowed (→ CC0, Public Domain Mark, CC BY, CC BY-SA), mature content excluded, photographs only. **Check the exact parameter names against the live API in Phase 0.**
- **Search terms:** favour dynamic poses (dance, sport, martial arts, climbing, parkour, yoga, workers lifting, running, throwing), plus everyday standing, sitting and reaching.
- **Exclusions:** drop records missing license, creator or source URL. Keep single-person images with ≥ 9 visible core joints. Deduplicate by ID.
- **Review:** one teammate reviews the whole corpus for nudity and inappropriate content before the demo.
- **Storage:** keypoints, signature and URLs only. Thumbnails are hotlinked. A broken thumbnail shows a placeholder plus the source link.

## 9. Data files

```text
index.json   [{ id, provider, thumb, landing, license, license_version, creator, title,
                attribution, j: number[26], v: number[13], sig: {…signature…} }]
stats.json   { count, features: { <name>: { p2, p5, p50, p95, p98 } } }
rules.json   { tolerances, region_weights, family_thresholds, countercheck }
```

Size target: ≤ 1.5 MB gzipped for ~3,000 entries. The index is versioned in the repo (`index.v1.json`) and rebuilt wholesale.

## 10. Stack

| Layer | Choice |
|---|---|
| App | Vite + TypeScript + React (D-001) |
| Pose model | MediaPipe Pose Landmarker: `@mediapipe/tasks-vision` in the browser, `mediapipe` in Python, same `.task` model file, self-hosted |
| Ingest | Python 3.11 |
| Hosting | Free static host (Cloudflare Pages / Vercel / GitHub Pages; verify current free-tier limits) |
| Tests | Vitest (signature, match, families, counter-check) + pytest (signature, ingest smoke), both on `shared/test-vectors/` |

## 11. Architecture decisions

**ADR-001: Static app + prebuilt index, no backend.** *Proposed.* Nothing in the requirements needs a server; privacy (NFR-001) and $0 cost (NFR-003) come for free. Trade-off: the corpus is fixed at build time. Revisit past ~50k entries.

**ADR-002: Match structure (signature) rather than raw joint distance.** *Proposed.* Joint-coordinate distance treats all differences alike and can't explain itself. Region scores over named features (tilts, bends, balance, line of action) match *mechanics* and produce explanations for the evidence view. Trade-off: signature code must be identical in two languages (NFR-005).

**ADR-003: 2D image-plane analysis, not 3D.** *Proposed.* Learners draw what the camera sees, and 3D lifting from sketches is unreliable. Trade-off: foreshortening distorts ratios (handled by low weight and "apparent" labels). 3D matching is a later option.

**ADR-004: Openverse as the only source.** *Proposed.* It already covers Wikimedia Commons and Flickr with consistent license fields. One integration, one license format.

**ADR-005: Manual joint placement is a first-class path.** *Proposed.* Automatic detection on drawings is uncertain. Making manual placement over the sketch a normal step means the product works either way, and the Phase 0 result only changes which path is the default.

## 12. Testing

- **Signature vectors:** hand-made joint sets with known angles, e.g. a right elbow bent at exactly 90° gives `elbow_R = 90`. Both languages must pass.
- **Perturbation tests:** rotate one limb of a reference skeleton by a known angle, and check that only that feature and region change, by that amount.
- **Mirror test:** a mirrored skeleton scores 100 against the original with mirror on.
- **Families:** synthetic candidates land in the expected family.
- **Evaluation page:** automatic detection rate on the team's ~30 sketches (from Phase 0), plus the perturbation results.
