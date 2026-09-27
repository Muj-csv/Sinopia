/** FR-002: JPG/PNG (HEIC gets converted by the browser's own capture UI) <= 15 MB. */
export const MAX_CAPTURE_BYTES = 15 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']

export function validateCaptureFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    return 'Please choose a photo (JPG or PNG).'
  }
  if (file.size > MAX_CAPTURE_BYTES) return 'That photo is larger than 15 MB.'
  return null
}
