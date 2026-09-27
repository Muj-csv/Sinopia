import { describe, expect, it } from 'vitest'
import { clampSlider, compositeClipInset } from './sliderMath'

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

describe('compositeClipInset', () => {
  it('fully hides the composite at 0 (all photo)', () => {
    expect(compositeClipInset(0)).toBe('inset(0 100% 0 0)')
  })
  it('fully reveals the composite at 100 (all drawing)', () => {
    expect(compositeClipInset(100)).toBe('inset(0 0% 0 0)')
  })
  it('reveals half at 50', () => {
    expect(compositeClipInset(50)).toBe('inset(0 50% 0 0)')
  })
})
