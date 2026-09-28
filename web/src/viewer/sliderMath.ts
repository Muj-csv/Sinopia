/**
 * PHASE-4 task 2: Reality <-> Drawing slider. value=0 is all-photo,
 * value=100 is all-drawing (composite). DESIGN_BRIEF/PRD: arrow keys step
 * by 5, Home/End jump to the ends -- a native <input type=range step=5>
 * already does all of that, so this file only needs the blend math.
 */
export const SLIDER_MIN = 0
export const SLIDER_MAX = 100
export const SLIDER_STEP = 5

export function clampSlider(value: number): number {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, value))
}

/**
 * Opacity for the composite (top) layer: the drawing FADES in over the photo as the value rises.
 *
 * A fade, not a wipe. DESIGN_BRIEF.md §9 calls this the signature moment -- it is the paint going
 * over the underdrawing, which is the concept the whole app is named after. The wipe it replaces
 * (a clip-path inset with a draggable handle) is the stock before/after plugin look, and is on the
 * forbidden list. The value drives opacity directly, with no easing, so the artist's hand controls
 * the blend frame for frame.
 */
export function compositeOpacity(value: number): number {
  return clampSlider(value) / 100
}
