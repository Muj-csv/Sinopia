/**
 * Sketch preprocessing before pose detection (spike/detect.py, ARCHITECTURE.md
 * capture component). Ported from the 4 variants in spike/detect.py.
 *
 * spike/RESULTS.md never got real gesture sketches, so Phase 0 could not
 * measure a detection rate per variant and "best" was never decided
 * (blocks D-002, docs/DECISIONS.md). DEFAULT_VARIANT below is the most
 * complete pipeline (all 3 improvements layered), chosen as the best
 * available guess pending real numbers -- revisit once spike/detect.py has
 * been run against real sketches.
 *
 * Operates on plain ImageData-shaped objects (not a real canvas 2D
 * context) so the pixel logic is unit-testable under jsdom, which has no
 * canvas implementation. Browser-only glue that bridges a real
 * <canvas>/ImageBitmap to this shape lives in canvasUtils.ts.
 */

export interface RawImageData {
  width: number
  height: number
  /** RGBA, length === width * height * 4. */
  data: Uint8ClampedArray
}

function toGrayscale(img: RawImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(img.width * img.height)
  const { data } = img
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // ITU-R BT.601 luma, matches PIL's ImageOps.grayscale.
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return gray
}

/** Mirrors PIL's ImageOps.autocontrast(gray, cutoff=1). */
function autocontrast(gray: Uint8ClampedArray, cutoff = 1): Uint8ClampedArray {
  const hist = new Array<number>(256).fill(0)
  for (const v of gray) hist[v]++
  const total = gray.length
  const cut = Math.floor((total * cutoff) / 100)

  let lo = 0
  for (let sum = 0; lo < 255; lo++) {
    sum += hist[lo]
    if (sum > cut) break
  }
  let hi = 255
  for (let sum = 0; hi > 0; hi--) {
    sum += hist[hi]
    if (sum > cut) break
  }
  if (hi <= lo) return gray.slice()

  const scale = 255 / (hi - lo)
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = Math.round((gray[i] - lo) * scale)
  }
  return out
}

/** 3x3 min filter: darkens by taking the darkest neighbor, thickening dark lines. */
function minFilter3(gray: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 255
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy))
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx))
          const v = gray[yy * width + xx]
          if (v < m) m = v
        }
      }
      out[y * width + x] = m
    }
  }
  return out
}

/** Composites near-white pixels onto a light-gray "paper" background. */
function grayFill(gray: Uint8ClampedArray): Uint8ClampedArray {
  const paper = 235
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] > 245 ? paper : gray[i]
  }
  return out
}

function grayToRaw(gray: Uint8ClampedArray, width: number, height: number): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    data[i] = data[i + 1] = data[i + 2] = gray[p]
    data[i + 3] = 255
  }
  return { width, height, data }
}

export function variantRaw(img: RawImageData): RawImageData {
  return { width: img.width, height: img.height, data: img.data.slice() }
}

export function variantContrast(img: RawImageData): RawImageData {
  const gray = autocontrast(toGrayscale(img))
  return grayToRaw(gray, img.width, img.height)
}

export function variantDilated(img: RawImageData): RawImageData {
  const gray = autocontrast(toGrayscale(img))
  const dilated = minFilter3(gray, img.width, img.height)
  return grayToRaw(dilated, img.width, img.height)
}

export function variantGrayFill(img: RawImageData): RawImageData {
  const gray = autocontrast(toGrayscale(img))
  const dilated = minFilter3(gray, img.width, img.height)
  const filled = grayFill(dilated)
  return grayToRaw(filled, img.width, img.height)
}

export const VARIANTS = {
  raw: variantRaw,
  grayscale_contrast: variantContrast,
  grayscale_contrast_dilated: variantDilated,
  grayscale_contrast_dilated_gray_fill: variantGrayFill,
} as const

export type VariantName = keyof typeof VARIANTS

/** See module docstring: pending real Phase 0 detection-rate data. */
export const DEFAULT_VARIANT: VariantName = 'grayscale_contrast_dilated_gray_fill'

export function preprocessForDetection(img: RawImageData): RawImageData {
  return VARIANTS[DEFAULT_VARIANT](img)
}
