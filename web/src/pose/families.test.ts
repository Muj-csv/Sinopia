/** ARCHITECTURE.md §12: "synthetic candidates land in the expected family." */
import { describe, expect, it } from 'vitest'
import { classifyFamily, groupByFamily, type Family } from './families'
import { TOP_K_FAMILIES, type RankedMatch, type Region } from './match'

function regions(overrides: Partial<Record<Region, number>>): Partial<Record<Region, number>> {
  return overrides
}

function match(id: string, regionScores: Partial<Record<Region, number>>): RankedMatch<string> {
  const scores = Object.values(regionScores)
  const overall = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length
  return { entry: id, overall, regions: regionScores, mirrored: false }
}

describe('classifyFamily', () => {
  it('same_gesture: every available region >= 80', () => {
    const r = regions({ torso: 85, shoulders: 90, pelvis: 82, left_arm: 80, right_leg: 95 })
    expect(classifyFamily(r)).toBe('same_gesture')
  })

  it('same_upper_body: torso/shoulders/both arms >= 80, at least one leg < 70', () => {
    const r = regions({
      torso: 85,
      shoulders: 90,
      left_arm: 82,
      right_arm: 88,
      left_leg: 40,
      right_leg: 95, // one leg low is enough; the other can be high
    })
    expect(classifyFamily(r)).toBe('same_upper_body')
  })

  it('same_upper_body requires all four upper regions present and >= 80', () => {
    const r = regions({ torso: 85, shoulders: 90, left_arm: 82, left_leg: 40 }) // right_arm missing
    expect(classifyFamily(r)).toBe('related')
  })

  it('same_lower_body: pelvis/both legs >= 80, at least one arm < 70', () => {
    const r = regions({ pelvis: 88, left_leg: 85, right_leg: 90, left_arm: 30, right_arm: 95 })
    expect(classifyFamily(r)).toBe('same_lower_body')
  })

  it('falls to related when upper regions match but no leg is clearly excluded', () => {
    // Legs are 75 -- below the 80 gesture bar, but not below the 70 exclusion bar either.
    const r = regions({ torso: 85, shoulders: 85, left_arm: 85, right_arm: 85, left_leg: 75, right_leg: 75 })
    expect(classifyFamily(r)).toBe('related')
  })

  it('falls to related with no usable regions', () => {
    expect(classifyFamily({})).toBe('related')
  })

  it('gesture takes priority over upper/lower body when both would qualify', () => {
    // All regions high enough for same_gesture; also happens to satisfy same_upper_body's
    // required fields, but same_gesture must win (ARCHITECTURE.md §6 ordering).
    const r = regions({ torso: 90, shoulders: 90, left_arm: 90, right_arm: 90, left_leg: 90, right_leg: 90 })
    expect(classifyFamily(r)).toBe('same_gesture')
  })
})

describe('groupByFamily', () => {
  it('buckets each match into its family, preserving order', () => {
    const gesture = match('gesture', { torso: 90, shoulders: 90 })
    const upper = match('upper', { torso: 90, shoulders: 90, left_arm: 90, right_arm: 90, left_leg: 30 })
    const lower = match('lower', { pelvis: 90, left_leg: 90, right_leg: 90, left_arm: 30 })
    const related = match('related', { torso: 50 })

    const groups = groupByFamily([gesture, upper, lower, related])
    expect(groups.same_gesture.map((m) => m.entry)).toEqual(['gesture'])
    expect(groups.same_upper_body.map((m) => m.entry)).toEqual(['upper'])
    expect(groups.same_lower_body.map((m) => m.entry)).toEqual(['lower'])
    expect(groups.related.map((m) => m.entry)).toEqual(['related'])
  })

  it('drops anything beyond the top TOP_K_FAMILIES matches', () => {
    const matches: RankedMatch<string>[] = Array.from({ length: TOP_K_FAMILIES + 5 }, (_, i) =>
      match(String(i), { torso: 50 }),
    )
    const groups = groupByFamily(matches)
    const total =
      groups.same_gesture.length +
      groups.same_upper_body.length +
      groups.same_lower_body.length +
      groups.related.length
    expect(total).toBe(TOP_K_FAMILIES)
  })

  it('a match appears in exactly one family', () => {
    const families: Family[] = ['same_gesture', 'same_upper_body', 'same_lower_body', 'related']
    const m = match('x', { torso: 90, shoulders: 90 })
    const groups = groupByFamily([m])
    const appearances = families.filter((f) => groups[f].some((r) => r.entry === 'x'))
    expect(appearances).toHaveLength(1)
  })
})
