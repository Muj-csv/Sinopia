/** Pure geometry helpers for dragging/nudging joints in JointEditor.tsx. */

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** Maps a pointer event's client coordinates to normalized [0,1] image-plane coords. */
export function pointToNormalized(clientX: number, clientY: number, rect: Rect): [number, number] {
  return [clamp01((clientX - rect.left) / rect.width), clamp01((clientY - rect.top) / rect.height)]
}

export const KEY_STEP = 0.01
export const KEY_STEP_LARGE = 0.04

/** Arrow-key nudge for the selected joint (PHASE-3 task 2: keyboard movement). */
export function stepForKey(key: string, shift: boolean): [number, number] | null {
  const step = shift ? KEY_STEP_LARGE : KEY_STEP
  switch (key) {
    case 'ArrowLeft':
      return [-step, 0]
    case 'ArrowRight':
      return [step, 0]
    case 'ArrowUp':
      return [0, -step]
    case 'ArrowDown':
      return [0, step]
    default:
      return null
  }
}
