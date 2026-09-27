# Phase 3: Save, publish, Sketchbook

**When:** Sep 28–29. **Owners:** Ian (flows), P5 (Sketchbook UI).
**Goal:** frescoes that are private by default, publishable with a chosen precision, and reversible.
**Implements:** FR-001, FR-006, FR-007, FR-008, FR-012; NFR-001, NFR-005.

## Tasks
1. `src/auth/`: Google + GitHub sign-in (Supabase OAuth); sign-in gate on New, Publish and Report; profile display name editable.
2. Finish form (FR-006) with validation matching the database limits.
3. Save (FR-007): upload photo, drawing, composite, thumb to `sketchbook/<uid>/<fid>/` (`cacheControl: '31536000'`); insert `frescoes` (private) then `fresco_locations`. On failure keep the draft and show retry.
4. Publish (FR-008): precision choice (default neighborhood; warning text for exact); upload the four files to `globe/<uid>/<fid>/`; update `visibility='public'`, `pin_precision`. Unpublish: update to private, then delete the globe files. Delete: remove both buckets' files, then the row.
5. `src/sketchbook/`: the owner's frescoes (select own rows), grouped by place or month; carousel on phones; detail with edit, publish/unpublish, delete; signed URLs for private images.
6. Playwright smoke: sign in (test user) → save private → not visible to a second test user → publish → visible → unpublish → gone.

## Acceptance
- The smoke test passes against the deployed preview.
- A published neighborhood fresco's public point differs from the exact point (check in the dashboard).
- No private image URL works without the owner's session.

## Don't touch
Globe rendering, viewer.

Stop and report.
