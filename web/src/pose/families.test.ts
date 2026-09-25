import { describe, expect, it } from 'vitest'
import { groupFamilies } from './families'
import type { IndexEntry, MatchResult, RegionKey } from './match'

const dummyEntry: IndexEntry = {
  id: 'x',
  provider: 'test',
  thumb: '',
  landing: '',
  license: 'CC0',
  creator: 'test',
  title: 'test',
  attribution: 'test',
  j: [],
  v: [],
  sig: {},
}

function result(id: string, regions: Partial<Record<RegionKey, number>>): MatchResult {
  return { entry: { ...dummyEntry, id }, overall: 0, regions, mirrored: false }
}

const ALL_HIGH: Partial<Record<RegionKey, number>> = {
  torso: 90, shoulders: 90, pelvis: 90,
  left_arm: 90, right_arm: 90, left_leg: 90, right_leg: 90, gesture: 90,
}

describe('groupFamilies', () => {
  it('classifies a full-body match as same_gesture (ARCHITECTURE §6)', () => {
    const families = groupFamilies([result('a', ALL_HIGH)])
    expect(families.same_gesture.map((m) => m.entry.id)).toEqual(['a'])
    expect(families.counts.same_gesture).toBe(1)
  })

  it('classifies matching upper body + differing legs as same_upper_body', () => {
    const regions = { ...ALL_HIGH, left_leg: 50, right_leg: 60 }
    const families = groupFamilies([result('b', regions)])
    expect(families.same_upper_body.map((m) => m.entry.id)).toEqual(['b'])
    expect(families.same_gesture).toHaveLength(0)
  })

  it('classifies matching lower body + differing arms as same_lower_body', () => {
    const regions = { ...ALL_HIGH, left_arm: 40, right_arm: 55 }
    const families = groupFamilies([result('c', regions)])
    expect(families.same_lower_body.map((m) => m.entry.id)).toEqual(['c'])
    expect(families.same_gesture).toHaveLength(0)
  })

  it('falls back to related when neither upper nor lower body fully matches', () => {
    const regions = { ...ALL_HIGH, left_arm: 40, left_leg: 40 }
    const families = groupFamilies([result('d', regions)])
    expect(families.related.map((m) => m.entry.id)).toEqual(['d'])
  })

  it('puts each entry in exactly one family, in priority order', () => {
    const gesture = result('gesture', ALL_HIGH)
    const upper = result('upper', { ...ALL_HIGH, left_leg: 30, right_leg: 30 })
    const lower = result('lower', { ...ALL_HIGH, left_arm: 30, right_arm: 30 })
    const related = result('related', { ...ALL_HIGH, left_arm: 30, left_leg: 30 })

    const families = groupFamilies([gesture, upper, lower, related])
    expect(families.counts).toEqual({
      same_gesture: 1,
      same_upper_body: 1,
      same_lower_body: 1,
      related: 1,
    })
  })

  it('a region with no available scores is never classified as same_gesture', () => {
    const families = groupFamilies([result('empty', {})])
    expect(families.same_gesture).toHaveLength(0)
    expect(families.related).toHaveLength(1)
  })
})
