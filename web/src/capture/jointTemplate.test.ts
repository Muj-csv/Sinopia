import { describe, expect, it } from 'vitest'
import { CORE_JOINT_NAMES } from '../pose/signature'
import { TEMPLATE_JOINTS, withTemplateDefaults } from './jointTemplate'

describe('TEMPLATE_JOINTS', () => {
  it('defines a normalized [0,1] position for every core joint', () => {
    for (const name of CORE_JOINT_NAMES) {
      const [x, y] = TEMPLATE_JOINTS[name]
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
  })
})

describe('withTemplateDefaults', () => {
  it('fills every joint from the template when given none', () => {
    const filled = withTemplateDefaults({})
    expect(Object.keys(filled).sort()).toEqual([...CORE_JOINT_NAMES].sort())
    for (const name of CORE_JOINT_NAMES) {
      const [x, y] = TEMPLATE_JOINTS[name]
      expect(filled[name]).toEqual({ x, y, v: 1 })
    }
  })

  it('keeps provided joints untouched and only fills the missing ones', () => {
    const filled = withTemplateDefaults({ nose: { x: 0.1, y: 0.2, v: 0.9 } })
    expect(filled.nose).toEqual({ x: 0.1, y: 0.2, v: 0.9 })
    expect(filled.hip_L).toEqual({ x: TEMPLATE_JOINTS.hip_L[0], y: TEMPLATE_JOINTS.hip_L[1], v: 1 })
  })
})
