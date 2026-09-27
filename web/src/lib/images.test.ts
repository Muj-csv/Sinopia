/**
 * jsdom has no real <canvas>/Web Worker support, so browser-image-compression's
 * actual pixel work can't run here (same constraint noted in Phase 3's
 * preprocess.ts tests). This tests the wrapper's contract instead: it
 * requests EXIF-stripping WebP output at the right budgets/dimensions,
 * computes dimensions via createImageBitmap, and flags budget overruns --
 * real end-to-end compression is verified manually in the browser.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('browser-image-compression', () => ({ default: vi.fn() }))

const imageCompression = (await import('browser-image-compression')).default
const {
  prepareImage,
  withinBudget,
  PHOTO_MAX_DIMENSION,
  THUMB_MAX_DIMENSION,
  PHOTO_QUALITY,
  PHOTO_MAX_BYTES,
  THUMB_MAX_BYTES,
} = await import('./images')

afterEach(() => {
  vi.resetAllMocks()
})

function fakeBlob(bytes: number, type = 'image/webp'): File {
  return new File([new Uint8Array(bytes)], 'out.webp', { type })
}

function stubCreateImageBitmap(width: number, height: number) {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close: vi.fn() }))
}

const original = new File([new Uint8Array(1000)], 'photo.jpg', { type: 'image/jpeg' })

describe('prepareImage', () => {
  it('requests WebP output at the documented dimensions/quality, EXIF-stripped by default', async () => {
    vi.mocked(imageCompression).mockImplementation((_file, opts) =>
      Promise.resolve(
        fakeBlob(opts?.maxWidthOrHeight === PHOTO_MAX_DIMENSION ? 300 * 1024 : 10 * 1024),
      ),
    )
    stubCreateImageBitmap(1600, 1200)

    await prepareImage(original)

    expect(imageCompression).toHaveBeenCalledTimes(2)
    for (const [, opts] of vi.mocked(imageCompression).mock.calls) {
      expect(opts?.fileType).toBe('image/webp')
      expect(opts?.initialQuality).toBe(PHOTO_QUALITY)
      expect(opts?.preserveExif).not.toBe(true)
    }
    const dims = vi.mocked(imageCompression).mock.calls.map(([, opts]) => opts?.maxWidthOrHeight)
    expect(dims).toContain(PHOTO_MAX_DIMENSION)
    expect(dims).toContain(THUMB_MAX_DIMENSION)
  })

  it('returns the compressed photo/thumb blobs and the photo dimensions', async () => {
    vi.mocked(imageCompression).mockResolvedValue(fakeBlob(1234))
    stubCreateImageBitmap(1600, 1067)

    const result = await prepareImage(original)

    expect(result.width).toBe(1600)
    expect(result.height).toBe(1067)
    expect(result.photo.size).toBe(1234)
    expect(result.thumb.size).toBe(1234)
  })
})

describe('withinBudget', () => {
  it('true when both outputs are under budget', () => {
    expect(
      withinBudget({
        photo: fakeBlob(PHOTO_MAX_BYTES - 1),
        thumb: fakeBlob(THUMB_MAX_BYTES - 1),
        width: 1600,
        height: 1200,
      }),
    ).toBe(true)
  })

  it('false when the photo is over budget', () => {
    expect(
      withinBudget({
        photo: fakeBlob(PHOTO_MAX_BYTES + 1),
        thumb: fakeBlob(1),
        width: 1600,
        height: 1200,
      }),
    ).toBe(false)
  })

  it('false when the thumbnail is over budget', () => {
    expect(
      withinBudget({
        photo: fakeBlob(1),
        thumb: fakeBlob(THUMB_MAX_BYTES + 1),
        width: 1600,
        height: 1200,
      }),
    ).toBe(false)
  })
})
