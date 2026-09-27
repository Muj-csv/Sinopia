import { describe, expect, it } from 'vitest'
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, validateUploadFile } from './validateUpload'

describe('validateUploadFile', () => {
  it('accepts a PNG under the size limit', () => {
    expect(validateUploadFile({ type: 'image/png', size: 1024 })).toBeNull()
  })

  it('accepts a JPG under the size limit', () => {
    expect(validateUploadFile({ type: 'image/jpeg', size: 1024 })).toBeNull()
  })

  it.each(ACCEPTED_TYPES)('accepts every listed type: %s', (type) => {
    expect(validateUploadFile({ type, size: 1024 })).toBeNull()
  })

  it('rejects an unsupported type', () => {
    expect(validateUploadFile({ type: 'image/gif', size: 1024 })).toMatch(/PNG or JPG/)
  })

  it('rejects a file over 10 MB', () => {
    expect(validateUploadFile({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toMatch(
      /larger than 10 MB/,
    )
  })

  it('accepts a file exactly at the size limit', () => {
    expect(validateUploadFile({ type: 'image/png', size: MAX_UPLOAD_BYTES })).toBeNull()
  })
})
