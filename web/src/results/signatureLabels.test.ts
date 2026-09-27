import { describe, expect, it } from 'vitest'
import type { Signature } from '../pose/signature'
import { describeSignature } from './signatureLabels'

describe('describeSignature', () => {
  it('formats angle fields rounded with a degree sign', () => {
    const groups = describeSignature({ torso_lean: 12.6 })
    const torso = groups.find((g) => g.heading === 'Torso')
    expect(torso?.rows).toEqual([
      { field: 'torso_lean', label: 'Torso lean from vertical', value: '13°' },
    ])
  })

  it('formats ratio/distance fields to 2 decimals, no degree sign', () => {
    const groups = describeSignature({ ratio_upper_arm_L: 0.5782795552070882 })
    const arm = groups.find((g) => g.heading === 'Left arm')
    expect(arm?.rows).toEqual([
      { field: 'ratio_upper_arm_L', label: 'Left upper arm length (of torso)', value: '0.58' },
    ])
  })

  it('skips missing (undefined) features entirely', () => {
    const groups = describeSignature({ torso_lean: 0 })
    expect(groups.find((g) => g.heading === 'Shoulders')).toBeUndefined()
  })

  it('describes weight_side in plain language under Gesture', () => {
    const cases: [Signature['weight_side'], string][] = [
      ['L', 'on the left foot'],
      ['R', 'on the right foot'],
      ['even', 'even on both feet'],
    ]
    for (const [side, expected] of cases) {
      const groups = describeSignature({ weight_side: side })
      const gesture = groups.find((g) => g.heading === 'Gesture')
      expect(gesture?.rows).toContainEqual({ field: 'weight_side', label: 'Weight', value: expected })
    }
  })

  it('omits a group entirely when none of its fields are present', () => {
    expect(describeSignature({})).toEqual([])
  })

  it('never uses grading language ("correct", "error", "score")', () => {
    const groups = describeSignature({
      torso_lean: 10,
      shoulder_tilt: 5,
      pelvis_tilt: -5,
      weight_side: 'even',
    })
    const text = JSON.stringify(groups).toLowerCase()
    for (const banned of ['correct', 'error', 'score', 'safe', 'guaranteed']) {
      expect(text).not.toContain(banned)
    }
  })
})
