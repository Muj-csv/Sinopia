/**
 * Drawing colours. These are pigment the artist puts on the photo, not app chrome, so they are
 * deliberately their own list rather than theme tokens -- the theme's job is the interface around
 * the artwork (DESIGN_BRIEF.md §3).
 */
export interface Swatch {
  value: string
  /** Said aloud by screen readers and shown as the swatch tooltip; colour alone can't carry state. */
  name: string
}

export const PALETTE: Swatch[] = [
  { value: '#1A1A1A', name: 'Black' },
  { value: '#FFFFFF', name: 'White' },
  { value: '#B3261E', name: 'Red' },
  { value: '#D4650F', name: 'Orange' },
  { value: '#FFD139', name: 'Yellow' },
  { value: '#237636', name: 'Green' },
  { value: '#1D3557', name: 'Blue' },
  { value: '#6D4C8C', name: 'Purple' },
  { value: '#C85C8E', name: 'Pink' },
]

export const MAX_RECENT_COLORS = 8

/** Case-insensitive, so '#fff' typed by a picker and '#FFF' from the palette are one colour. */
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * The swatches to offer: recents first, then the rest of the palette.
 *
 * This replaced `recent.length > 0 ? recent : PALETTE`, which swapped the palette OUT as soon as
 * the artist drew a single stroke, leaving exactly one colour to choose from.
 */
export function swatchesFor(recent: readonly string[]): Swatch[] {
  const recentSwatches = recent.map((value) => ({
    value,
    name: PALETTE.find((s) => same(s.value, value))?.name ?? value.toUpperCase(),
  }))
  const rest = PALETTE.filter((s) => !recent.some((r) => same(r, s.value)))
  return [...recentSwatches, ...rest]
}

/** Most recent first, no duplicates, capped. */
export function rememberColor(recent: readonly string[], color: string): string[] {
  return [color, ...recent.filter((c) => !same(c, color))].slice(0, MAX_RECENT_COLORS)
}
