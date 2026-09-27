import { describe, expect, it } from 'vitest'
import { interpretPredictions } from './nsfwCheck'

describe('interpretPredictions', () => {
  it('does not flag a clearly safe classification', () => {
    const result = interpretPredictions([
      { className: 'Neutral', probability: 0.95 },
      { className: 'Drawing', probability: 0.04 },
      { className: 'Porn', probability: 0.01 },
    ])
    expect(result.flagged).toBe(false)
  })

  it('flags Porn at or above the threshold', () => {
    const result = interpretPredictions([{ className: 'Porn', probability: 0.6 }])
    expect(result.flagged).toBe(true)
    expect(result.reason).toContain('porn')
  })

  it('flags Hentai and Sexy the same way', () => {
    expect(interpretPredictions([{ className: 'Hentai', probability: 0.7 }]).flagged).toBe(true)
    expect(interpretPredictions([{ className: 'Sexy', probability: 0.7 }]).flagged).toBe(true)
  })

  it('does not flag below the threshold', () => {
    const result = interpretPredictions([{ className: 'Porn', probability: 0.59 }])
    expect(result.flagged).toBe(false)
  })

  it('ignores classes outside the flagged set regardless of probability', () => {
    const result = interpretPredictions([{ className: 'Neutral', probability: 0.99 }])
    expect(result.flagged).toBe(false)
  })

  it('returns false for an empty prediction list', () => {
    expect(interpretPredictions([]).flagged).toBe(false)
  })
})
