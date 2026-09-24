# Phase 0: Detection test results

## Status: partially blocked

The detection pipeline (`detect.py`) is built and verified working end to
end — model download, 4 preprocessing variants, MediaPipe inference, joint
visibility counting, overlay PNG generation. **The actual detection-rate
numbers below are not available yet** because `spike/sketches/` has no real
gesture sketches. This repo has no team-produced sketch set to draw from.

**This blocks D-002** (default capture path). Nothing else in the
implementation plan depends on it — Phase 0's acceptance note says so
explicitly ("It doesn't block later phases").

### What's verified working
- `pose_landmarker_lite.task` downloads and loads correctly (self-hosted,
  gitignored — each environment fetches it once via `ensure_model()`).
- `PoseLandmarker` in `IMAGE` running mode runs successfully in this
  Python 3.14 environment (`mediapipe==1.0.1`).
- All 4 preprocessing variants (raw; grayscale + contrast stretch; +
  line dilation; + light-gray fill) execute without error and produce
  visibly different images.
- Overlay PNG generation (skeleton drawn over the processed image) works.
- Smoke-tested against one synthetic stick-figure PNG (not a real gesture
  sketch, not committed) — pipeline completed without crashing. Detection
  rate on a synthetic line drawing isn't meaningful data and isn't reported
  as a result.

### Detection rate per variant
*Not available — pending real sketches.*

| Variant | Detected | Avg core joints visible (of 13) |
|---|---|---|
| raw | — | — |
| grayscale + contrast stretch | — | — |
| + line dilation | — | — |
| + light-gray fill | — | — |

### Best variant
*Not available — pending real sketches.*

### 3 annotated failures
*Not available — pending real sketches.*

## To unblock

1. Add ~30 real gesture sketches (PNG/JPG) to `spike/sketches/` — the
   team's own quick 20 s–2 min figure sketches, per PRD §3/§6.
2. Run `pip install -r ../ingest/requirements.txt` then `python detect.py`
   from `spike/`.
3. Fill in the table above from `out/detect_results.json` and the console
   summary; pick 3 failing images from `out/overlays/` to annotate.
4. Update D-002 in `docs/DECISIONS.md` (auto-detect first if the best
   variant's detection rate is ≥ ~60%, else manual placement first).

---

## Openverse field probe — done

Live query against `https://api.openverse.org/v1/images/` (`q=person
dancing`, `license_type=commercial,modification`, `mature=false`,
`category=photograph`, `page_size=5`). 240 results matched; 5 raw records
saved to `out/openverse_probe_results.json` (gitignored, regeneratable via
`python openverse_probe.py`).

**Real field names for `ingest.py` (Phase 2) / `index.schema.json`:**

| ARCHITECTURE.md §8-9 name | Real Openverse field |
|---|---|
| license | `license` (e.g. `"cc0"`, `"by"`) |
| license version | `license_version` (e.g. `"1.0"`, `"2.0"`) |
| creator | `creator` |
| landing / source URL | `foreign_landing_url` |
| thumbnail | `thumbnail` |
| provider | `provider` (e.g. `"rawpixel"`, `"flickr"`) |
| id (dedup key) | `id` |
| attribution (precomputed) | `attribution` — Openverse already generates the title-author-source-license line described in FR-008 |

**Note for ingest.py (Phase 2):** the top result in this sample has
`"creator": null`. ARCHITECTURE §8 says drop records missing license,
creator or source URL — confirmed this actually happens in practice, not
just a theoretical edge case. The exclusion filter must check for `None`,
not just a missing key.

**Other useful fields spotted, not currently planned for use:** `tags`
(list of `{name, accuracy, unstable__provider}`), `mature` (bool, should
already be `false` given the query filter — worth asserting in ingest.py
rather than trusting the filter silently), `category`, `filetype`,
`height`/`width`.
