import { describe, expect, it } from 'vitest'
import { formatCoords, formatLat, formatLng } from './coords'

describe('formatLat', () => {
  it('marks the northern hemisphere', () => {
    expect(formatLat(15.145)).toBe('15.1450° N')
  })
  it('marks the southern hemisphere without a minus sign', () => {
    expect(formatLat(-33.8688)).toBe('33.8688° S')
  })
  it('treats the equator as north rather than printing -0', () => {
    expect(formatLat(0)).toBe('0.0000° N')
  })
})

describe('formatLng', () => {
  it('marks east and west', () => {
    expect(formatLng(120.593)).toBe('120.5930° E')
    expect(formatLng(-0.1276)).toBe('0.1276° W')
  })
})

describe('formatCoords', () => {
  it('reads like a map legend', () => {
    expect(formatCoords(15.145, 120.593)).toBe('15.1450° N, 120.5930° E')
  })
})
