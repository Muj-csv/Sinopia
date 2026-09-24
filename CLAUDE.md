# Sinopia

Static web app that turns a gesture sketch into evidence. It reads the sketch's body structure as a **pose signature**, finds openly licensed photos with matching mechanics, and shows region by region where the sketch agrees or differs from real bodies. Pose detection runs in the browser; the reference index is prebuilt offline.

Read first: `docs/PRD.md` (what and why) → `docs/ARCHITECTURE.md` (how) → `docs/IMPLEMENTATION_PLAN.md` (order) → `docs/DECISIONS.md` (open questions).

## Rules
- **No backend, no database** (ADR-001). The app is static; the index is `web/public/index.v1.json` + `stats.json`.
- **Never download images to keep or re-host.** Store keypoints, signatures and URLs only; thumbnails are hotlinked.
- The pose signature exists twice, `ingest/signature.py` and `web/src/pose/signature.ts`, and both must pass `shared/test-vectors/`. Any change updates the vectors.
- All tolerances, weights and thresholds live in `shared/rules.json`; don't hard-code them.
- Same MediaPipe `.task` model file in ingest and browser, self-hosted.
- 2D image-plane analysis; no rotation normalization (ADR-002, ADR-003).
- Manual joint placement is a normal path, not an error screen (ADR-005).
- UI wording: "pose geometry similarity" and "difference from this reference"; never "correct", "error", "score of your drawing", "safe" or "guaranteed" (PRD §4, NFR-004).
- Openverse is the only ingest source; drop records missing license, creator or source URL.

## Layout
```
ingest/        ingest.py, signature.py, tests/
shared/        rules.json, test-vectors/, index.schema.json
web/           Vite + TS app: src/capture, src/pose (signature, match, families, countercheck), src/evidence, src/eval
docs/          spec + build/PHASE-N.md
spike/         Phase 0 detection test
```

## Commands
- `cd web && npm i && npm run dev` · `npm test`
- `cd ingest && pip install -r requirements.txt && pytest && python ingest.py --limit 3000`

## Out of scope
Image generation · text→pose · accounts · mobile apps · 3D mannequin · non-Openverse sources · step-by-step construction guide (later) · any server.

## Keeping docs current
`README.md` is a living draft. When a feature lands or changes, update its row in the README Features table (Planned → Done) in the same change.

## How to work
Do one `docs/build/PHASE-N.md` at a time, run the tests, then **stop and report**.
