import { describe, expect, it } from 'vitest'
import type { FamilyGroups } from '../pose/families'
import { pickDefaultFamily } from './familyOrder'

function groupsWith(nonEmpty: (keyof FamilyGroups<number>)[]): FamilyGroups<number> {
  const groups: FamilyGroups<number> = {
    same_gesture: [],
    same_upper_body: [],
    same_lower_body: [],
    related: [],
  }
  for (const key of nonEmpty) {
    groups[key].push({ entry: 1, overall: 100, regions: {}, mirrored: false })
  }
  return groups
}

describe('pickDefaultFamily', () => {
  it('prefers same_gesture when available', () => {
    expect(pickDefaultFamily(groupsWith(['same_gesture', 'related']))).toBe('same_gesture')
  })

  it('falls back to same_upper_body next', () => {
    expect(pickDefaultFamily(groupsWith(['same_upper_body', 'same_lower_body', 'related']))).toBe(
      'same_upper_body',
    )
  })

  it('falls back to same_lower_body next', () => {
    expect(pickDefaultFamily(groupsWith(['same_lower_body', 'related']))).toBe('same_lower_body')
  })

  it('falls back to related when nothing more specific is available', () => {
    expect(pickDefaultFamily(groupsWith(['related']))).toBe('related')
  })

  it('defaults to related even when every group is empty', () => {
    expect(pickDefaultFamily(groupsWith([]))).toBe('related')
  })
})
