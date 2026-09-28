import { describe, expect, it } from 'vitest'
import { clampSlider, compositeOpacity } from './sliderMath'

describe('clampSlider', () => {
  it('passes through in-range values', () => {
    expect(clampSlider(50)).toBe(50)
  })
  it('clamps below 0', () => {
    expect(clampSlider(-10)).toBe(0)
  })
  it('clamps above 100', () => {
    expect(clampSlider(150)).toBe(100)
  })
})

describe('compositeOpacity', () => {
  it('fully hides the drawing at 0 (all photo)', () => {
    expect(compositeOpacity(0)).toBe(0)
  })
  it('fully shows the drawing at 100', () => {
    expect(compositeOpacity(100)).toBe(1)
  })
  it('blends evenly at 50', () => {
    expect(compositeOpacity(50)).toBe(0.5)
  })
  it('clamps out-of-range values', () => {
    expect(compositeOpacity(-10)).toBe(0)
    expect(compositeOpacity(150)).toBe(1)
  })
})
