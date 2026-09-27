# Phase 1: Capture + draw

**When:** Sep 27–28. **Owners:** P2 (canvas), P3 (capture).
**Goal:** from a photo to a drawing on it, on a phone.
**Implements:** FR-002, FR-003, FR-004; NFR-001 (EXIF stripping), NFR-002, NFR-006.
**Design:** `docs/design/UX_MAP.md` (Capture, Draw), `DESIGN_BRIEF.md` components.

## Tasks
1. `src/capture/`: camera (`<input type="file" accept="image/*" capture="environment">`) and upload (JPG/PNG ≤ 15 MB); read GPS + time with exifr; fallbacks: device geolocation, then map picker (MapLibre mini-map with a draggable pin). Reverse geocode once via Nominatim (≤ 1 req/s, `Accept-Language` from the browser) for a suggested place name.
2. Image pipeline (`src/lib/images.ts`): resize to ≤ 1600 px long side, WebP q≈0.8 via browser-image-compression (web worker), 400 px thumbnail. Unit test: output has no EXIF, sizes within ARCHITECTURE §7 budgets.
3. `src/draw/`: Konva stage with the photo on a locked layer + 3 drawing layers; Perfect Freehand brush; eraser (destination-out); color picker with 8 recent colors; size and opacity; undo/redo (≥ 50 steps, per layer operations); pinch-zoom and two-finger pan; clear layer with confirm; layer visibility toggles.
4. Draft autosave (sinopia) to IndexedDB every 10 s and on page hide; resume prompt on return.
5. Export: drawing layers merged to a transparent WebP at photo resolution; composite (photo + drawing) WebP; both via the image pipeline.
6. Keyboard: undo/redo shortcuts, brush size keys; every control has a label and 44 px touch target.

## Acceptance
- On a mid-range phone: photo → pin → 30 strokes with no visible lag; undo/redo works; reload restores the draft.
- Photo without GPS falls back cleanly; denied geolocation goes to the map picker.
- Exported images pass the "no EXIF" test and size budgets.

## Don't touch
Saving to Supabase, references, globe.

Stop and report (include a short screen recording from the phone).
