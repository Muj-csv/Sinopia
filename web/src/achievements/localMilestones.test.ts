import { beforeEach, describe, expect, it } from 'vitest'
import { hasMilestone, markMilestone } from './localMilestones'

beforeEach(() => {
  window.localStorage.clear()
})

describe('localMilestones', () => {
  it('starts unreached', () => {
    expect(hasMilestone('eyedropper')).toBe(false)
  })

  it('is reached once marked', () => {
    markMilestone('eyedropper')
    expect(hasMilestone('eyedropper')).toBe(true)
  })

  it('marking twice is harmless', () => {
    markMilestone('doodle-guess')
    markMilestone('doodle-guess')
    expect(hasMilestone('doodle-guess')).toBe(true)
  })

  it('keeps milestones independent of each other', () => {
    markMilestone('pinned-reference')
    expect(hasMilestone('eyedropper')).toBe(false)
    expect(hasMilestone('doodle-guess')).toBe(false)
  })
})
