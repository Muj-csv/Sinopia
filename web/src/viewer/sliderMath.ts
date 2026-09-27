/**
 * PHASE-4 task 2: Reality <-> Drawing slider. value=0 is all-photo,
 * value=100 is all-drawing (composite). DESIGN_BRIEF/PRD: arrow keys step
 * by 5, Home/End jump to the ends -- a native <input type=range step=5>
 * already does all of that, so this file only needs the clip math.
 */
export const SLIDER_MIN = 0
export const SLIDER_MAX = 100
export const SLIDER_STEP = 5

export function clampSlider(value: number): number {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, value))
}

/** clip-path inset for the composite (top) layer: reveals more of it as value increases. */
export function compositeClipInset(value: number): string {
  const clamped = clampSlider(value)
  return `inset(0 ${100 - clamped}% 0 0)`
}
