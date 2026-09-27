/** Reference query sanitization (ARCHITECTURE.md §5: length + control-char stripping). */
import { describe, expect, it } from 'vitest'
import { sanitizeQuery } from './references'

describe('sanitizeQuery', () => {
  it('trims whitespace', () => {
    expect(sanitizeQuery('  fire hydrant  ')).toBe('fire hydrant')
  })

  it('strips control characters', () => {
    expect(sanitizeQuery('fire\x00 hydrant\x1f')).toBe('fire hydrant')
  })

  it('caps length at 60 characters', () => {
    const long = 'a'.repeat(100)
    expect(sanitizeQuery(long)).toHaveLength(60)
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeQuery(undefined)).toBe('')
    expect(sanitizeQuery(42)).toBe('')
  })
})
