/** FR-001: PNG/JPG, <= 10 MB. Pure so it's testable without a real File. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

export function validateUploadFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Please choose a PNG or JPG image.'
  if (file.size > MAX_UPLOAD_BYTES) return 'That image is larger than 10 MB.'
  return null
}
