/** FR-001: upload / camera / canvas drawing, all normalized to a data URL. */
export type CaptureMethod = 'upload' | 'camera' | 'draw'

export interface CapturedImage {
  dataUrl: string
  width: number
  height: number
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // FR-001: PNG/JPG <= 10 MB
export const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

export function loadImage(dataUrl: string): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = dataUrl
  })
}
