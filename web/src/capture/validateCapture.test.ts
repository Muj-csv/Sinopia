import { describe, expect, it } from 'vitest'
import { ACCEPTED_TYPES, MAX_CAPTURE_BYTES, validateCaptureFile } from './validateCapture'

describe('validateCaptureFile', () => {
  it.each(ACCEPTED_TYPES)('accepts %s under the size limit', (type) => {
    expect(validateCaptureFile({ type, size: 1024 })).toBeNull()
  })

  it('rejects a non-image type', () => {
    expect(validateCaptureFile({ type: 'application/pdf', size: 1024 })).toMatch(/photo/)
  })

  it('rejects a file over 15 MB', () => {
    expect(validateCaptureFile({ type: 'image/jpeg', size: MAX_CAPTURE_BYTES + 1 })).toMatch(
      /15 MB/,
    )
  })

  it('accepts exactly at the size limit', () => {
    expect(validateCaptureFile({ type: 'image/jpeg', size: MAX_CAPTURE_BYTES })).toBeNull()
  })
})
