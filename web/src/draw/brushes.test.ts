import { describe, expect, it } from 'vitest'
import { BRUSHES, BRUSH_ORDER, isBrush, strokeOptions, strokeWidth } from './brushes'

describe('isBrush', () => {
  it('separates the eraser from the brushes', () => {
    expect(isBrush('eraser')).toBe(false)
    for (const name of BRUSH_ORDER) expect(isBrush(name)).toBe(true)
  })
})

describe('strokeWidth', () => {
  it('scales each brush so the three read as different marks', () => {
    expect(strokeWidth('pencil', 10)).toBeLessThan(strokeWidth('pen', 10))
    expect(strokeWidth('marker', 10)).toBeGreaterThan(strokeWidth('pen', 10))
  })

  it('draws the pen at exactly the chosen size', () => {
    expect(strokeWidth('pen', 10)).toBe(10)
  })

  // An eraser that rubbed out 2.2x its indicated width would be unusable.
  it('never scales the eraser', () => {
    expect(strokeWidth('eraser', 22)).toBe(22)
  })
})

describe('brush characteristics', () => {
  it('makes the pencil tapered and the marker not', () => {
    expect(BRUSHES.pencil.thinning).toBeGreaterThan(BRUSHES.pen.thinning)
    expect(BRUSHES.marker.thinning).toBe(0)
  })

  it('keeps only the pen fully opaque, so pencil and marker build up', () => {
    expect(BRUSHES.pen.opacity).toBe(1)
    expect(BRUSHES.pencil.opacity).toBeLessThan(1)
    expect(BRUSHES.marker.opacity).toBeLessThan(1)
  })
})

describe('strokeOptions', () => {
  it('gives the eraser a predictable even edge', () => {
    expect(strokeOptions('eraser')).toEqual(strokeOptions('pen'))
  })

  it('returns the brush’s own feel', () => {
    expect(strokeOptions('marker').streamline).toBe(BRUSHES.marker.streamline)
  })
})
