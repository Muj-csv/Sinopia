import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, computeUnlockedIds, type AchievementContext } from './achievements'

const baseStats: AchievementContext['stats'] = {
  frescoCount: 0,
  publishedCount: 0,
  friendCount: 0,
  hasFavorite: false,
  hasExactPin: false,
  hasTag: false,
}
const noMilestones: AchievementContext['milestones'] = {
  eyedropper: false,
  'pinned-reference': false,
  'doodle-guess': false,
}

function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    stats: { ...baseStats, ...overrides.stats },
    milestones: { ...noMilestones, ...overrides.milestones },
  }
}

describe('ACHIEVEMENTS', () => {
  it('has at least 10 achievements with unique ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('nothing is unlocked from a blank slate', () => {
    expect(computeUnlockedIds(ctx())).toEqual(new Set())
  })
})

describe('computeUnlockedIds', () => {
  it('unlocks save milestones at the right counts', () => {
    expect(computeUnlockedIds(ctx({ stats: { ...baseStats, frescoCount: 1 } }))).toEqual(
      new Set(['first-save']),
    )
    expect(computeUnlockedIds(ctx({ stats: { ...baseStats, frescoCount: 5 } }))).toEqual(
      new Set(['first-save', 'five-saved']),
    )
    expect(computeUnlockedIds(ctx({ stats: { ...baseStats, frescoCount: 10 } }))).toEqual(
      new Set(['first-save', 'five-saved', 'ten-saved']),
    )
  })

  it('unlocks publish milestones independently of saves', () => {
    const unlocked = computeUnlockedIds(ctx({ stats: { ...baseStats, publishedCount: 5 } }))
    expect(unlocked.has('first-publish')).toBe(true)
    expect(unlocked.has('five-published')).toBe(true)
    expect(unlocked.has('ten-published')).toBe(false)
    expect(unlocked.has('first-save')).toBe(false)
  })

  it('unlocks the friend achievements from friendCount', () => {
    const unlocked = computeUnlockedIds(ctx({ stats: { ...baseStats, friendCount: 1 } }))
    expect(unlocked).toEqual(new Set(['first-friend']))
  })

  it('unlocks one-off flags from their matching stat', () => {
    expect(
      computeUnlockedIds(ctx({ stats: { ...baseStats, hasFavorite: true } })).has(
        'favorite-chosen',
      ),
    ).toBe(true)
    expect(
      computeUnlockedIds(ctx({ stats: { ...baseStats, hasExactPin: true } })).has('exact-pin'),
    ).toBe(true)
    expect(computeUnlockedIds(ctx({ stats: { ...baseStats, hasTag: true } })).has('tagged')).toBe(
      true,
    )
  })

  it('unlocks local-milestone achievements straight from the flag, no stats needed', () => {
    const unlocked = computeUnlockedIds(ctx({ milestones: { ...noMilestones, eyedropper: true } }))
    expect(unlocked).toEqual(new Set(['eyedropper']))
  })

  it('can unlock everything at once', () => {
    const unlocked = computeUnlockedIds(
      ctx({
        stats: {
          frescoCount: 10,
          publishedCount: 10,
          friendCount: 5,
          hasFavorite: true,
          hasExactPin: true,
          hasTag: true,
        },
        milestones: { eyedropper: true, 'pinned-reference': true, 'doodle-guess': true },
      }),
    )
    expect(unlocked.size).toBe(ACHIEVEMENTS.length)
  })
})
