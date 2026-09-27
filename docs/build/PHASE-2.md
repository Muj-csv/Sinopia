# Phase 2: References

**When:** Sep 28 (parallel with Phase 1). **Owner:** P5.
**Goal:** a reference for anything, without leaving the canvas.
**Implements:** FR-005, NFR-004.

## Tasks
1. `src/references/`: a Reference button in the drawing toolbar opens a side panel (desktop, ≥ md) or a draggable bottom sheet (phone) that doesn't block the canvas; search box (≤ 60 chars) with debounce 400 ms; results grid of thumbnails from `/api/references`; tap to enlarge; pin one reference to keep it visible while drawing.
2. Every result shows license (e.g. "CC BY 2.0"), creator and a source link; the NFR-004 statement appears once in the panel footer. Hide results missing license or source.
3. Angle chips (*if time in this phase*): "side view", "from above", "close-up" run the query with that suffix.
4. States per UX_MAP: idle (suggested words), loading, no results, error with retry, rate-limited.
5. Session cache of queries in memory; the function's CDN cache handles repeats across users.

## Acceptance
- "fire hydrant", "shiba inu", "vending machine", "jeepney", "torii gate" each return ≥ 6 licensed results in ≤ 2 s on 4G.
- Drawing continues with the panel open; the pinned reference stays visible.
- No reference image is uploaded to Supabase.

## Don't touch
Drawing internals (use the toolbar slot P2 provides), save flow.

Stop and report the five test searches' result counts and times.
