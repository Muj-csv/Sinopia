/**
 * FR-002: read GPS + capture time from a photo's EXIF before it goes
 * through images.ts's resize/WebP pass (which strips EXIF as a side
 * effect -- this must run on the original file).
 */
import * as exifr from 'exifr'

export interface ExifResult {
  lat: number | null
  lng: number | null
  capturedAt: string | null
}

export async function readExif(file: File | Blob): Promise<ExifResult> {
  const [gps, tags] = await Promise.all([
    exifr.gps(file).catch(() => null),
    exifr.parse(file, ['DateTimeOriginal']).catch(() => null),
  ])

  const capturedAtRaw = tags?.DateTimeOriginal
  const capturedAt =
    capturedAtRaw instanceof Date
      ? capturedAtRaw.toISOString()
      : typeof capturedAtRaw === 'string'
        ? capturedAtRaw
        : null

  return {
    lat: gps?.latitude ?? null,
    lng: gps?.longitude ?? null,
    capturedAt,
  }
}

export function hasGps(result: ExifResult): boolean {
  return result.lat !== null && result.lng !== null
}
