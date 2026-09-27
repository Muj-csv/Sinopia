/**
 * FR-003: resize + re-encode as WebP (this also strips EXIF, including
 * GPS -- exifr.readExif() must run on the *original* file before this).
 * Budgets from ARCHITECTURE.md §7: photo <= 350KB at 1600px WebP q=0.8,
 * thumbnail <= 40KB at 400px.
 */
import imageCompression from 'browser-image-compression'

export const PHOTO_MAX_DIMENSION = 1600
export const THUMB_MAX_DIMENSION = 400
export const PHOTO_QUALITY = 0.8
export const PHOTO_MAX_BYTES = 350 * 1024
export const THUMB_MAX_BYTES = 40 * 1024

export interface PreparedImage {
  photo: Blob
  thumb: Blob
  width: number
  height: number
}

async function dimensionsOf(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap
  bitmap.close()
  return { width, height }
}

/**
 * Resizes + re-encodes a captured photo to the app's storage budgets.
 * `preserveExif` is intentionally omitted (defaults to false in
 * browser-image-compression) so GPS/EXIF never survives into the file
 * that gets uploaded or stored in a draft.
 */
export async function prepareImage(file: File | Blob): Promise<PreparedImage> {
  const source = file instanceof File ? file : new File([file], 'photo', { type: file.type })

  const photo = await imageCompression(source, {
    maxWidthOrHeight: PHOTO_MAX_DIMENSION,
    fileType: 'image/webp',
    initialQuality: PHOTO_QUALITY,
    useWebWorker: true,
  })

  const thumb = await imageCompression(source, {
    maxWidthOrHeight: THUMB_MAX_DIMENSION,
    fileType: 'image/webp',
    initialQuality: PHOTO_QUALITY,
    useWebWorker: true,
  })

  const { width, height } = await dimensionsOf(photo)
  return { photo, thumb, width, height }
}

export function withinBudget(prepared: PreparedImage): boolean {
  return prepared.photo.size <= PHOTO_MAX_BYTES && prepared.thumb.size <= THUMB_MAX_BYTES
}
