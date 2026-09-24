import { describe, expect, it } from 'vitest'

// Phase 0: confirms the Vitest toolchain runs in CI. Real coverage
// (signature, match, families, countercheck) lands in later phases.
describe('toolchain smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
