# Sinopia: Product Requirements

*Sinopia* (the underdrawing painters sketched beneath a fresco) · **S**ketch **I**nterpreted **N**ext to **O**bserved **P**hotographic **I**nstances of **A**natomy

| | |
|---|---|
| Version | 0.3 |
| Status | Ready to build (open decisions in `DECISIONS.md`) |
| Owner | Jum Flores and team |
| Updated | 2026-09-24 |
| Event | Global Innovation Build Challenge V2, Track 03 (Open). Deadline **Oct 1, 2026, 11:45 pm "CST"** (timezone to confirm, see D-003) |

> **Turn your gesture sketch into evidence.**

## 1. Summary

Sinopia is a reality check for gesture drawing. A learner uploads or draws a rough gesture sketch. Sinopia reads the body structure from it as a **pose signature** (torso lean, shoulder and pelvis tilt, limb angles, balance, line of action). It then finds real photographs whose body mechanics match, and shows **where the sketch's construction agrees or differs from real bodies**, region by region.

Searching photos is the mechanism, not the product. The product is the comparison between a drawing and photographic reality. Every reference comes from openly licensed sources and carries its license and attribution. That's a trust layer, not the headline.

## 2. Problem

Gesture-drawing learners make fast, rough figure sketches. When a sketch "looks wrong", they usually can't tell *why*: is the pelvis tilted the wrong way, is the weight leg not under the body, is the arm bent past what a body does? Finding a reference is hard because poses can't be described in words. Even with a reference, comparing drawing and photo is done by eye, which is exactly the skill they're still learning.

## 3. Users

- **Primary:** gesture-drawing learners (students and self-taught artists) who make 30 s – 2 min gesture sketches and want real-world checks.
- **Secondary:** illustrators who need a real reference for one specific body relationship ("the body is right, but I can't figure out this arm").

## 4. Goals and non-goals

**Goals**
- G-1: Turn a rough sketch into a pose signature the user can see and correct.
- G-2: Return real references that match the *structure* of the gesture, not just overall joint positions.
- G-3: Show per-region agreement and differences between the sketch and a chosen reference, in angles the learner can act on.
- G-4: Every reference shown carries its source license information and attribution.

**Non-goals:** generating images; grading drawings or claiming a drawing is "correct"; text-to-pose search; a general reference library; accounts; mobile apps; hosting or redistributing images.

**Language rule:** results are described as **pose geometry similarity** and **differences from this reference**, never as a correctness score or "error".

## 5. Scope

| MVP | Supporting (if time allows) | Later |
|---|---|---|
| Sketch capture (upload, photo, or in-browser canvas) · skeleton extraction with manual correction · pose signature · structural match · evidence view · gesture families · lock-a-relationship search · license + attribution | Counter-check ("uncommon in this reference set") · evaluation page · keyboard joint editing | Step-by-step construction guide (line of action → stick figure → masses → cylinders) · larger corpus · camera-angle-aware matching (3D) |

## 6. User journeys

1. **Reality check (primary).** Upload or draw a sketch → a skeleton appears over it → adjust any misplaced joint → see the pose signature → see matching references grouped into gesture families → open one → evidence view shows sketch vs photo with region-by-region similarity and the largest differences → use the reference (license + attribution shown).
2. **Detection fails.** "Couldn't find a figure. Place the joints on your sketch." Joint placement opens with the sketch underneath; the journey continues from the signature step.
3. **Fix one part.** In the evidence view, lock *torso + right arm* → search again → references that preserve that relationship while other parts vary.

## 7. Functional requirements

| ID | Requirement |
|---|---|
| FR-001 | **Sketch capture:** upload an image (PNG/JPG ≤ 10 MB), take a camera photo, or draw directly on an in-browser canvas. |
| FR-002 | **Skeleton extraction:** detect 13 core joints automatically; show them over the sketch; every joint can be dragged. If detection fails or confidence is low, open manual joint placement with the sketch as background. |
| FR-003 | **Pose signature:** compute and display the signature (ARCHITECTURE §4): torso lean, shoulder tilt, pelvis tilt, tilt contrast, head offset, 8 limb-segment angles, 4 joint bends, apparent limb ratios, balance offset and weight side, line-of-action angle and curvature. |
| FR-004 | **Structural match:** rank the corpus by region-weighted signature similarity (mirror-aware) and return the top 24. |
| FR-005 | **Gesture families:** group the top 60 candidates into *Same gesture*, *Same upper body (different legs)* and *Same lower body (different upper body)*, with counts. |
| FR-006 | **Evidence view:** sketch and reference side by side, with toggles Sketch / Skeleton / Photo / Overlay (reference skeleton aligned to the sketch at the hips and scaled by torso length). Shows per-region similarity (Torso, Shoulders, Pelvis, Left arm, Right arm, Left leg, Right leg, Gesture) and the 3 largest angle differences in plain words ("Right elbow: yours 150°, reference 95°"). |
| FR-007 | **Lock a relationship:** select one or more regions; the search then scores only those regions. |
| FR-008 | **License + attribution:** each reference shows license, creator, source and a link to the source page; "Copy attribution" copies a title-author-source-license line. Entries with missing license or source metadata are excluded at ingest. |
| FR-009 *(supporting)* | **Counter-check:** if a sketch relationship falls outside the corpus's 2nd–98th percentile and no reference matches that region at ≥ 70%, flag it: "Uncommon in this reference set (0 of N references). It may be stylized or worth checking." |
| FR-010 *(supporting)* | **Evaluation page:** automatic detection rate on the team's sketch set, and correctness checks of the signature (ARCHITECTURE §8). |

## 8. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | **Privacy:** sketches never leave the user's device; all processing runs in the browser. |
| NFR-002 | **Performance:** search + families ≤ 1 s for ~3,000 references on a mid-range laptop; first load (model + index) ≤ 6 s on ~10 Mbps. |
| NFR-003 | **Cost:** $0 to run (static hosting). |
| NFR-004 | **Licensing statement:** "Every displayed result carries the license information reported by its source, plus attribution metadata. Entries with missing licensing metadata are excluded. License information is as reported upstream and should be checked at the source before reuse." Never claim results are "safe" or "guaranteed". |
| NFR-005 | **Consistency:** the pose signature is identical in Python (ingest) and TypeScript (app) within 0.01°, checked by shared test vectors. |
| NFR-006 | **Accessibility:** joints can be moved with the keyboard; results have alt text; contrast meets WCAG AA. |

## 9. Data

- **Reference (index entry):** id, provider, thumbnail URL, source page URL, license, license version, creator, title, attribution line, normalized joints, joint visibility, pose signature.
- The index is built by the ingest script, read-only in the app, and rebuilt (not edited). No image files are stored.
- **Corpus stats:** per-feature percentile tables used by the counter-check, built with the index.
- **Sketch and query:** in memory only; never stored or transmitted.

## 10. AI and model use

- **Model:** MediaPipe Pose Landmarker for joint detection (the same model file in ingest and in the browser).
- **The model only estimates joint positions.** Signatures, matching, grouping, comparisons and licensing are deterministic code.
- **Failure handling:** if detection fails, manual joint placement takes over; the product works without automatic detection.
- **Known limitation:** the model is trained on photos, so detection on drawings is less reliable. Research such as Sketch2Pose (ACM TOG 2022) addresses this and is a possible later improvement.

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Detection fails on loose sketches | Medium–High | Medium | Manual placement is always available; the Phase 0 test decides the default path |
| 2D limb ratios distorted by foreshortening | High | Medium | Ratios labelled "apparent"; low weight in matching; explained in the evidence view |
| Nudity in figure-reference results | Medium | High | Mature-content filter at ingest + manual review of the whole corpus before the demo |
| Upstream license metadata wrong | Low–Medium | Medium | NFR-004 wording; source link on every result |
| Small corpus skews the counter-check | High | Medium | "In this reference set" wording, with the reference count shown; supporting scope only |
| Judges compare with Aphrite / PoseSearch / Posematic | High | Medium | Those tools find poses; Sinopia compares your drawing's structure to real bodies (evidence view, families, lock) |
| Same team building Pasabi this week | ? | High | D-004 |

## 12. Definition of Done (GIBC V2)

- MVP scope works end to end at a public URL.
- Public repo with README.
- 2–5 minute demo video with English audio or subtitles.
- At least 3 screenshots.
- Devpost description with "Built With" list and all team members' real names.
