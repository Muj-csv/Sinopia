/**
 * Avatar parts (Update 1.2). An avatar is drawn from a handful of interchangeable parts, stored as
 * a small set of indices rather than an image, so a profile costs a few bytes and the whole cast
 * can be redrawn later by editing this file alone.
 *
 * **There is no gender option, and no part belongs to one.** Every option is offered to everyone
 * and named for what it looks like -- a length, a texture, a shape -- never for who is expected to
 * wear it. Picking "who you are" from two buttons is the thing this deliberately does not do.
 *
 * The colours live here rather than in theme.css for the same reason the drawing palette does
 * (see `draw/palette.ts`): "the theme's job is the interface around the artwork". Skin and hair
 * are the artwork.
 */

export interface AvatarConfig {
  skin: number
  hair: number
  hairColor: number
  face: number
  wear: number
  extra: number
  frame: number
}

export interface Option {
  /** Said aloud by screen readers and shown under the swatch; shape alone can't carry meaning. */
  label: string
}

export interface ColorOption extends Option {
  value: string
}

/** A broad range that does not run light-to-dark as if that were a ranking. */
export const SKINS: ColorOption[] = [
  { value: '#F4D6C1', label: 'Porcelain' },
  { value: '#E8B68C', label: 'Sand' },
  { value: '#C98A5E', label: 'Amber' },
  { value: '#9C6340', label: 'Chestnut' },
  { value: '#6F4227', label: 'Umber' },
  { value: '#43281A', label: 'Espresso' },
]

export const HAIR_COLORS: ColorOption[] = [
  { value: '#1A1A1A', label: 'Ink' },
  { value: '#4A2C17', label: 'Chestnut' },
  { value: '#B5762F', label: 'Honey' },
  { value: '#D9D4CC', label: 'Silver' },
  { value: '#B3261E', label: 'Red' },
  { value: '#6D4C8C', label: 'Violet' },
]

/** Named for length and texture only. */
export const HAIR: Option[] = [
  { label: 'Shaved' },
  { label: 'Cropped' },
  { label: 'Wavy' },
  { label: 'Long' },
  { label: 'Coiled' },
  { label: 'Bun' },
  { label: 'Braids' },
  { label: 'Headwrap' },
]

export const FACES: Option[] = [
  { label: 'Calm' },
  { label: 'Smiling' },
  { label: 'Thinking' },
  { label: 'Delighted' },
]

export const WEAR: Option[] = [
  { label: 'Round neck' },
  { label: 'Collar' },
  { label: 'Scarf' },
  { label: 'Overalls' },
]

export const EXTRAS: Option[] = [
  { label: 'Nothing' },
  { label: 'Glasses' },
  { label: 'Earring' },
  { label: 'Cap' },
  { label: 'Freckles' },
]

/** Paper-family grounds only, so an avatar never fights the ink-on-paper chrome around it. */
export const FRAMES: ColorOption[] = [
  { value: '#FFFFFF', label: 'Paper' },
  { value: '#F9DD8F', label: 'Yellow tint' },
  { value: '#E4ECF3', label: 'Sea' },
  { value: '#EDEFF2', label: 'Desk' },
]

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 1,
  hair: 1,
  hairColor: 0,
  face: 1,
  wear: 0,
  extra: 0,
  frame: 0,
}

const clamp = (n: unknown, length: number): number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < length ? n : 0

/**
 * Anything can be in a jsonb column -- an older app version's shape, a hand-edited row, null. Every
 * field is clamped to a real option so a bad value renders a plain avatar instead of a broken SVG.
 */
export function parseAvatar(raw: unknown): AvatarConfig {
  if (raw === null || typeof raw !== 'object') return DEFAULT_AVATAR
  const v = raw as Partial<Record<keyof AvatarConfig, unknown>>
  return {
    skin: clamp(v.skin, SKINS.length),
    hair: clamp(v.hair, HAIR.length),
    hairColor: clamp(v.hairColor, HAIR_COLORS.length),
    face: clamp(v.face, FACES.length),
    wear: clamp(v.wear, WEAR.length),
    extra: clamp(v.extra, EXTRAS.length),
    frame: clamp(v.frame, FRAMES.length),
  }
}
