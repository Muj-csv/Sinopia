import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VARIANT,
  type RawImageData,
  VARIANTS,
  preprocessForDetection,
  variantContrast,
  variantDilated,
  variantGrayFill,
  variantRaw,
} from './preprocess'

function solid(width: number, height: number, rgb: [number, number, number]): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0]
    data[i + 1] = rgb[1]
    data[i + 2] = rgb[2]
    data[i + 3] = 255
  }
  return { width, height, data }
}

function checker(width: number, height: number): RawImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const v = (x + y) % 2 === 0 ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return { width, height, data }
}

describe('preprocess variants', () => {
  it('variantRaw copies pixels unchanged', () => {
    const img = checker(4, 4)
    const out = variantRaw(img)
    expect(Array.from(out.data)).toEqual(Array.from(img.data))
    expect(out.data).not.toBe(img.data) // must be a copy, not aliased
  })

  it('produces output the same size as the input for every variant', () => {
    const img = checker(6, 5)
    for (const variant of Object.values(VARIANTS)) {
      const out = variant(img)
      expect(out.width).toBe(6)
      expect(out.height).toBe(5)
      expect(out.data.length).toBe(6 * 5 * 4)
    }
  })

  it('keeps full alpha and neutral (gray) RGB channels for the grayscale-based variants', () => {
    const img = checker(4, 4)
    for (const variant of [variantContrast, variantDilated, variantGrayFill]) {
      const out = variant(img)
      for (let i = 0; i < out.data.length; i += 4) {
        expect(out.data[i]).toBe(out.data[i + 1])
        expect(out.data[i + 1]).toBe(out.data[i + 2])
        expect(out.data[i + 3]).toBe(255)
      }
    }
  })

  it('does not crash on a solid-color image (degenerate histogram)', () => {
    const img = solid(4, 4, [128, 128, 128])
    for (const variant of Object.values(VARIANTS)) {
      expect(() => variant(img)).not.toThrow()
    }
  })

  it('dilation darkens or preserves a sparse dark pixel among light neighbors', () => {
    const img = solid(5, 5, [255, 255, 255])
    // Punch one dark pixel in the middle.
    const idx = (2 * 5 + 2) * 4
    img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = 0
    const out = variantDilated(img)
    // A neighbor that was pure white should now be pulled darker by the
    // 3x3 min filter picking up the dark center pixel.
    const neighborIdx = (2 * 5 + 1) * 4
    expect(out.data[neighborIdx]).toBeLessThan(255)
  })

  it('grayFill pushes near-white background toward the paper gray, not pure white', () => {
    const img = solid(4, 4, [255, 255, 255])
    const out = variantGrayFill(img)
    expect(out.data[0]).toBeLessThan(255)
    expect(out.data[0]).toBeGreaterThan(200) // still light, just not pure white
  })

  it('DEFAULT_VARIANT is the fully-layered pipeline and matches preprocessForDetection', () => {
    expect(DEFAULT_VARIANT).toBe('grayscale_contrast_dilated_gray_fill')
    const img = checker(4, 4)
    expect(preprocessForDetection(img).data).toEqual(VARIANTS[DEFAULT_VARIANT](img).data)
  })
})
