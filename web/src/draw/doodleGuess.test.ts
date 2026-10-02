import { describe, expect, it } from 'vitest'
import { rankGuesses, toLabel } from './doodleGuess'

describe('toLabel', () => {
  it('turns underscores into spaces', () => {
    expect(toLabel('fire_hydrant')).toBe('fire hydrant')
  })

  it('leaves words with no underscore alone', () => {
    expect(toLabel('cat')).toBe('cat')
  })
})

describe('rankGuesses', () => {
  const classes = ['cat', 'bus', 'fire_hydrant', 'tree']

  it('labels and sorts by probability, highest first', () => {
    const guesses = rankGuesses([0.1, 0.05, 0.7, 0.15], classes)
    expect(guesses.map((g) => g.label)).toEqual(['fire hydrant', 'tree', 'cat'])
  })

  it('caps the result at topK', () => {
    const guesses = rankGuesses([0.1, 0.05, 0.7, 0.15], classes, 2)
    expect(guesses).toHaveLength(2)
    expect(guesses[0].label).toBe('fire hydrant')
  })

  it('keeps the probability alongside each label', () => {
    const guesses = rankGuesses([0.1, 0.05, 0.7, 0.15], classes, 1)
    expect(guesses[0]).toEqual({ label: 'fire hydrant', probability: 0.7 })
  })

  it('returns nothing for an empty prediction', () => {
    expect(rankGuesses([], [])).toEqual([])
  })
})
