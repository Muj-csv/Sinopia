import { describe, expect, it } from 'vitest'
import {
  MAX_CAPTION,
  MAX_MEMORY,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE,
  frescoPath,
  isValid,
  pointWkt,
  snapToNeighborhoodGrid,
  validateFinishFields,
  type FinishFields,
} from './fresco'

function fields(overrides: Partial<FinishFields> = {}): FinishFields {
  return { title: 'A wall', caption: '', memory: '', tags: [], placeName: '', ...overrides }
}

describe('validateFinishFields', () => {
  it('passes with just a title', () => {
    expect(isValid(validateFinishFields(fields()))).toBe(true)
  })

  it('requires a non-empty title', () => {
    const errors = validateFinishFields(fields({ title: '' }))
    expect(errors.title).toBeDefined()
  })

  it('requires a title that is not just whitespace', () => {
    const errors = validateFinishFields(fields({ title: '   ' }))
    expect(errors.title).toBeDefined()
  })

  it('rejects a title over the database limit', () => {
    const errors = validateFinishFields(fields({ title: 'a'.repeat(MAX_TITLE + 1) }))
    expect(errors.title).toBeDefined()
  })

  it('accepts a title exactly at the limit', () => {
    const errors = validateFinishFields(fields({ title: 'a'.repeat(MAX_TITLE) }))
    expect(errors.title).toBeUndefined()
  })

  it('rejects a caption over the limit', () => {
    const errors = validateFinishFields(fields({ caption: 'a'.repeat(MAX_CAPTION + 1) }))
    expect(errors.caption).toBeDefined()
  })

  it('rejects memory over the limit', () => {
    const errors = validateFinishFields(fields({ memory: 'a'.repeat(MAX_MEMORY + 1) }))
    expect(errors.memory).toBeDefined()
  })

  it('rejects more than 5 tags', () => {
    const errors = validateFinishFields(fields({ tags: Array(MAX_TAGS + 1).fill('x') }))
    expect(errors.tags).toBeDefined()
  })

  it('accepts exactly 5 tags', () => {
    const errors = validateFinishFields(fields({ tags: Array(MAX_TAGS).fill('x') }))
    expect(errors.tags).toBeUndefined()
  })

  it('rejects a tag longer than 24 characters', () => {
    const errors = validateFinishFields(fields({ tags: ['a'.repeat(MAX_TAG_LENGTH + 1)] }))
    expect(errors.tags).toBeDefined()
  })

  it('rejects a place name over 200 characters', () => {
    const errors = validateFinishFields(fields({ placeName: 'a'.repeat(201) }))
    expect(errors.placeName).toBeDefined()
  })
})

describe('frescoPath', () => {
  it('builds <owner>/<fresco>/<file>.webp', () => {
    expect(frescoPath('u1', 'f1', 'photo')).toBe('u1/f1/photo.webp')
    expect(frescoPath('u1', 'f1', 'drawing')).toBe('u1/f1/drawing.webp')
    expect(frescoPath('u1', 'f1', 'composite')).toBe('u1/f1/composite.webp')
    expect(frescoPath('u1', 'f1', 'thumb')).toBe('u1/f1/thumb.webp')
  })
})

describe('pointWkt', () => {
  it('orders as POINT(lng lat), not lat/lng', () => {
    expect(pointWkt(14.6, 121.05)).toBe('POINT(121.05 14.6)')
  })
})

describe('snapToNeighborhoodGrid', () => {
  it('snaps to the nearest 0.005deg grid point', () => {
    expect(snapToNeighborhoodGrid(14.5993, 120.9843)).toEqual({ lat: 14.6, lng: 120.985 })
  })

  it('is idempotent on an already-snapped point', () => {
    const snapped = snapToNeighborhoodGrid(14.6, 121.05)
    expect(snapToNeighborhoodGrid(snapped.lat, snapped.lng)).toEqual(snapped)
  })
})
