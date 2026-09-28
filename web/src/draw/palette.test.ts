import { describe, expect, it } from 'vitest'
import { MAX_RECENT_COLORS, PALETTE, rememberColor, swatchesFor } from './palette'

describe('swatchesFor', () => {
  it('offers the whole palette before anything has been drawn', () => {
    expect(swatchesFor([])).toEqual(PALETTE)
  })

  // The shipped bug: `recent.length > 0 ? recent : PALETTE` left one colour after one stroke.
  it('keeps every palette colour available after a stroke', () => {
    const swatches = swatchesFor(['#1A1A1A'])
    expect(swatches.length).toBe(PALETTE.length)
    for (const colour of PALETTE) {
      expect(swatches.some((s) => s.value.toLowerCase() === colour.value.toLowerCase())).toBe(true)
    }
  })

  it('puts recents first, most recent leading', () => {
    expect(
      swatchesFor(['#237636', '#B3261E'])
        .slice(0, 2)
        .map((s) => s.value),
    ).toEqual(['#237636', '#B3261E'])
  })

  it('does not repeat a recent colour further down the palette', () => {
    const values = swatchesFor(['#FFD139']).map((s) => s.value.toLowerCase())
    expect(values.filter((v) => v === '#ffd139')).toHaveLength(1)
  })

  it('names a recent palette colour, and labels a custom one by its hex', () => {
    expect(swatchesFor(['#1a1a1a'])[0].name).toBe('Black')
    expect(swatchesFor(['#123456'])[0].name).toBe('#123456')
  })

  it('keeps custom colours alongside the palette', () => {
    const swatches = swatchesFor(['#123456'])
    expect(swatches).toHaveLength(PALETTE.length + 1)
  })
})

describe('rememberColor', () => {
  it('adds a new colour at the front', () => {
    expect(rememberColor(['#FFFFFF'], '#B3261E')).toEqual(['#B3261E', '#FFFFFF'])
  })

  it('moves an existing colour to the front instead of duplicating it', () => {
    expect(rememberColor(['#FFFFFF', '#B3261E'], '#B3261E')).toEqual(['#B3261E', '#FFFFFF'])
  })

  it('treats case-different hex as the same colour', () => {
    expect(rememberColor(['#ffffff'], '#FFFFFF')).toEqual(['#FFFFFF'])
  })

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => `#0000${i.toString(16).padStart(2, '0')}`)
    const remembered = many.reduce<string[]>((acc, c) => rememberColor(acc, c), [])
    expect(remembered).toHaveLength(MAX_RECENT_COLORS)
  })
})
