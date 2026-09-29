import { describe, expect, it } from 'vitest'
import { hashId, placeWorld } from './systemLayout'

const ids = ['ana', 'ben', 'cy', 'dee', 'eve', 'fay']

describe('hashId', () => {
  it('gives the same account the same number every time', () => {
    expect(hashId('ana')).toBe(hashId('ana'))
  })

  it('separates accounts whose ids differ by one character', () => {
    expect(hashId('ana')).not.toBe(hashId('anb'))
  })
})

describe('placeWorld', () => {
  it('puts a world in the same spot on every load', () => {
    expect(placeWorld('ana', 0, 6, 100)).toEqual(placeWorld('ana', 0, 6, 100))
  })

  /**
   * The whole reason placement is hashed rather than taken from list order: a new account must
   * not move everybody else's world.
   */
  it('keeps a world at its own size and spin when the system grows', () => {
    const before = placeWorld('ana', 0, 5, 100)
    const after = placeWorld('ana', 0, 6, 100)
    expect(after.size).toBe(before.size)
    expect(after.spin).toBe(before.spin)
  })

  it('gives the worlds visibly different sizes', () => {
    const sizes = ids.map((id, i) => placeWorld(id, i, ids.length, 100).size)
    expect(new Set(sizes).size).toBeGreaterThan(1)
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(1.15)
  })

  it('never shrinks a world into an unreadable speck', () => {
    for (const [i, id] of ids.entries()) {
      const { size } = placeWorld(id, i, ids.length, 100)
      expect(size).toBeGreaterThanOrEqual(70)
      expect(size).toBeLessThanOrEqual(135)
    }
  })

  it('turns every world, each at its own rate', () => {
    const spins = ids.map((id, i) => placeWorld(id, i, ids.length, 100).spin)
    for (const spin of spins) expect(spin).toBeGreaterThan(0)
    expect(new Set(spins).size).toBeGreaterThan(1)
  })

  it('keeps every world on screen', () => {
    for (const [i, id] of ids.entries()) {
      const { x, y } = placeWorld(id, i, ids.length, 100)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(100)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(100)
    }
  })

  it('never stacks two worlds on the same spot', () => {
    const spots = ids.map((id, i) => placeWorld(id, i, ids.length, 100))
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const gap = Math.hypot(spots[a].x - spots[b].x, spots[a].y - spots[b].y)
        expect(gap).toBeGreaterThan(10)
      }
    }
  })

  it('clears the centre, where your own world sits', () => {
    for (const [i, id] of ids.entries()) {
      const { x, y } = placeWorld(id, i, ids.length, 100)
      expect(Math.hypot(x - 50, y - 50)).toBeGreaterThan(25)
    }
  })
})
