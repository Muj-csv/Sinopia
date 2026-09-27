import { describe, expect, it } from 'vitest'
import { KEY_STEP, KEY_STEP_LARGE, clamp01, pointToNormalized, stepForKey } from './jointEditorMath'

describe('clamp01', () => {
  it('passes through in-range values', () => {
    expect(clamp01(0.5)).toBe(0.5)
  })
  it('clamps below 0', () => {
    expect(clamp01(-0.2)).toBe(0)
  })
  it('clamps above 1', () => {
    expect(clamp01(1.2)).toBe(1)
  })
})

describe('pointToNormalized', () => {
  const rect = { left: 100, top: 50, width: 200, height: 400 }

  it('maps the top-left corner to (0, 0)', () => {
    expect(pointToNormalized(100, 50, rect)).toEqual([0, 0])
  })

  it('maps the bottom-right corner to (1, 1)', () => {
    expect(pointToNormalized(300, 450, rect)).toEqual([1, 1])
  })

  it('maps the center to (0.5, 0.5)', () => {
    expect(pointToNormalized(200, 250, rect)).toEqual([0.5, 0.5])
  })

  it('clamps points outside the rect', () => {
    expect(pointToNormalized(-50, -50, rect)).toEqual([0, 0])
    expect(pointToNormalized(500, 900, rect)).toEqual([1, 1])
  })
})

describe('stepForKey', () => {
  it('moves left/right/up/down by KEY_STEP', () => {
    expect(stepForKey('ArrowLeft', false)).toEqual([-KEY_STEP, 0])
    expect(stepForKey('ArrowRight', false)).toEqual([KEY_STEP, 0])
    expect(stepForKey('ArrowUp', false)).toEqual([0, -KEY_STEP])
    expect(stepForKey('ArrowDown', false)).toEqual([0, KEY_STEP])
  })

  it('uses the larger step with shift held', () => {
    expect(stepForKey('ArrowRight', true)).toEqual([KEY_STEP_LARGE, 0])
  })

  it('returns null for non-arrow keys', () => {
    expect(stepForKey('Enter', false)).toBeNull()
    expect(stepForKey('a', false)).toBeNull()
  })
})
