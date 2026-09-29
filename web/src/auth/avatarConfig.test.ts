import { describe, expect, it } from 'vitest'
import { DEFAULT_AVATAR, HAIR, parseAvatar, SKINS } from './avatarConfig'

/**
 * parseAvatar guards a jsonb column, which can hold anything: an older build's shape, a
 * hand-edited row, null. A bad value has to render a plain avatar rather than a broken SVG.
 */
describe('parseAvatar', () => {
  it('keeps a valid configuration intact', () => {
    const config = { skin: 3, hair: 2, hairColor: 1, face: 1, wear: 2, extra: 3, frame: 1 }
    expect(parseAvatar(config)).toEqual(config)
  })

  it('falls back for a profile that has never chosen one', () => {
    expect(parseAvatar(null)).toEqual(DEFAULT_AVATAR)
  })

  it('clamps an index past the end of its option list', () => {
    expect(parseAvatar({ skin: SKINS.length + 99 }).skin).toBe(0)
    expect(parseAvatar({ hair: HAIR.length }).hair).toBe(0)
  })

  it('rejects negative, fractional and non-numeric indices', () => {
    expect(parseAvatar({ skin: -1 }).skin).toBe(0)
    expect(parseAvatar({ skin: 1.5 }).skin).toBe(0)
    expect(parseAvatar({ skin: '2' }).skin).toBe(0)
  })

  it('fills in fields a newer build added but this row predates', () => {
    expect(parseAvatar({ skin: 2 })).toEqual({ ...DEFAULT_AVATAR, skin: 2, hair: 0, face: 0 })
  })

  it('survives a value that is not an object at all', () => {
    expect(parseAvatar('nonsense')).toEqual(DEFAULT_AVATAR)
    expect(parseAvatar(42)).toEqual(DEFAULT_AVATAR)
  })
})

describe('avatar options', () => {
  it('names every option, since a swatch cannot be read aloud', () => {
    for (const option of [...SKINS, ...HAIR]) {
      expect(option.label.length).toBeGreaterThan(0)
    }
  })
})
