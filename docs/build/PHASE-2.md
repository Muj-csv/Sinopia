# Phase 2: Corpus + index

**Goal:** 2–3k openly licensed single-person references with signatures.
**Implements:** FR-008 (ingest side), NFR-004; builds the `index.json` and `stats.json` used by FR-004–005 and FR-009.

## Tasks
1. `ingest/ingest.py`: paginate Openverse over the search-term list (ARCHITECTURE §8) with the Phase 0 field names; retry with backoff; filter; detect joints; keep single-person images with ≥ 9 visible core joints; compute signatures with `signature.py`; build the attribution line; dedupe by ID.
2. Write `index.v1.json` (schema in `shared/index.schema.json`) and `stats.json` (per-feature p2/p5/p50/p95/p98).
3. `ingest/review.html` (a simple local page of thumbnails) so a teammate can review content and exclude IDs via `ingest/exclude.txt`.

## Acceptance
- ≥ 2,000 entries; 0 entries missing license, creator or source URL.
- Index validates against the schema; review completed with an exclusion list committed.
- Gzipped index ≤ 1.5 MB.

## Don't touch
The web UI (except copying the index into `web/public/`).

Stop and report entry counts by search term.
