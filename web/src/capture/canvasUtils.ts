/**
 * Bridges real <canvas>/ImageBitmap objects to the plain RawImageData shape
 * preprocess.ts operates on. Needs a real browser canvas 2D context, so
 * it's exercised manually rather than under vitest/jsdom.
 */
import type { RawImageData } from './preprocess'

export function imageSourceToRawImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
): RawImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.drawImage(source, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  return { width, height, data }
}

export function rawImageDataToCanvas(raw: RawImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = raw.width
  canvas.height = raw.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  const data = Uint8ClampedArray.from(raw.data)
  ctx.putImageData(new ImageData(data, raw.width, raw.height), 0, 0)
  return canvas
}
