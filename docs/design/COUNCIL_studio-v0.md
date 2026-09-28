# Design Council: Studio v0

2026-09-27 · Phase D, first critique · Built against `DESIGN_BRIEF.md` (draft) and scored on the 12-point rubric in `locked-pipeline.md`.
Checked at 390 × 844 (phone) and 1280 × 800 (laptop). ⚠ In my local check the Google Fonts didn't load, so **the type calls below must be confirmed on the live artifact.**

## 5 strongest aspects
1. **The canvas wins the information hierarchy.** On a phone, the chrome takes about 150 px of 844 with the sheet closed, which is under the 20% budget. *(Principle: content over chrome, and G-1.)*
2. **Yellow means exactly two things:** the one primary action (Finish) and the current tool. The eye learns that in one glance. *(Principle: one signal per meaning.)*
3. **References never take over the canvas.** Peek shows a single row, half stops at 50%, and *Pin to canvas* keeps a reference visible while the sheet is closed. That meets G-2 directly. *(Principle: keep the work visible; recognition over recall.)*
4. **One edge language:** a 2 px ink outline everywhere, plus the hard offset only on things you can press. There are no blurred shadows and no glass. *(Principle: consistent signifiers for affordance.)*
5. **Mistakes are cheap.** Undo and redo are always visible, the two- and three-finger taps mirror them, and "Clear layer" confirms inline *and* can be undone. *(Principle: error recovery over error warnings.)*

## Top problems, in priority order
1. **At half height, the reference sheet hides the lower half of the canvas on a phone.** You can't draw the street while you look at a reference. Fix: shrink the stage above the sheet (or cap half at 40%), and pan the canvas so the last stroke stays in view. *(Principle: keep the work area visible, G-2.)*
2. **The tray covers the bottom of the sheet on a phone**, which hides the last row of results. The sheet needs to sit above the tray. *(Principle: no clipped content.)*
3. **"Layer 1" wraps onto two lines** under its icon at phone width. Show the layer number as a small badge on the icon, or give that slot more width. *(Principle: stable labels; two-line labels are a named tell.)*
4. **Reference chips are full pills (999 px radius)**, which breaks the uneven "hand-cut" radius rule and falls back to the generic pill look. Use `--r-ctl`. *(Principle: component consistency, from the forbidden list.)*
5. **The stand-in icons read as geometric, not hand-drawn.** Until the Doodle Icons are in, the doodle voice rests only on the fonts. *(Principle: distinctiveness. Strip the fonts and this reads as any drawing app.)*
6. **There's no save status.** FR-004 autosaves every 10 s, and UX_MAP promised a quiet "saved on this device" signal plus a persistent notice if saving fails. *(Principle: visibility of system status.)*
7. **Focus doesn't move into the popovers.** A keyboard user opens Color and stays on the button. Move focus to the first control and return it on Esc. *(Principle: keyboard operability, NFR-006.)*
8. **The size popover has no preview** of the actual brush size or opacity, so a number stands in for what the artist needs to see. *(Principle: direct representation.)*
9. **Marker vs. pencil faces:** at 17–20 px, Gochi and Gaegu may read as one "handwriting" instead of two roles. Confirm on the live page. If they blur together, collapse to one. *(Principle: every visual difference should carry meaning.)*
10. **The top bar is tight at 390 px** (close, label, camera, undo, redo, Finish). *(Principle: breathing room at the smallest target.)*

## Unnecessary
- **The camera button in the Studio.** In the real flow the photo is chosen in Capture (UX_MAP S4). It's here only so you can test with your own photo, and it should be removed in the build, which also fixes problem 10.
- **12 starter swatches picked by me.** They trace to nothing. Recents plus the photo eyedropper (below) are enough.

## Missing
- **An eyedropper that samples from the photo.** When you draw over a real place, picking the wall's actual color is the most "only-Sinopia" tool there is. It isn't in the PRD, so ⚑ this would be a proposal.
- Small **layer thumbnails** in the Layers list.

## Drift toward generic patterns
- The pill chips (problem 4). Everything else stays inside the brief: no gradients, glass, left-stripe callouts or sparkle icons.
