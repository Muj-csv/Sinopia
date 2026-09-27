import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('exifr', () => ({
  gps: vi.fn(),
  parse: vi.fn(),
}))

const exifr = await import('exifr')
const { readExif, hasGps } = await import('./exif')

afterEach(() => {
  vi.resetAllMocks()
})

const file = new Blob(['fake'], { type: 'image/jpeg' })

describe('readExif', () => {
  it('returns lat/lng/capturedAt when GPS and date tags are present', async () => {
    vi.mocked(exifr.gps).mockResolvedValue({ latitude: 14.5995, longitude: 120.9842 })
    vi.mocked(exifr.parse).mockResolvedValue({ DateTimeOriginal: new Date('2026-09-27T10:00:00Z') })

    const result = await readExif(file)

    expect(result.lat).toBe(14.5995)
    expect(result.lng).toBe(120.9842)
    expect(result.capturedAt).toBe('2026-09-27T10:00:00.000Z')
  })

  it('returns nulls when there is no GPS data at all', async () => {
    vi.mocked(exifr.gps).mockRejectedValue(new Error('no gps'))
    vi.mocked(exifr.parse).mockResolvedValue({})

    const result = await readExif(file)

    expect(result.lat).toBeNull()
    expect(result.lng).toBeNull()
  })

  it('returns a null capturedAt when the date tag is missing', async () => {
    vi.mocked(exifr.gps).mockResolvedValue({ latitude: 1, longitude: 2 })
    vi.mocked(exifr.parse).mockResolvedValue({})

    const result = await readExif(file)

    expect(result.capturedAt).toBeNull()
  })

  it('never throws, even if exifr rejects entirely', async () => {
    vi.mocked(exifr.gps).mockRejectedValue(new Error('corrupt file'))
    vi.mocked(exifr.parse).mockRejectedValue(new Error('corrupt file'))

    await expect(readExif(file)).resolves.toEqual({ lat: null, lng: null, capturedAt: null })
  })
})

describe('hasGps', () => {
  it('true when both lat and lng are present', () => {
    expect(hasGps({ lat: 1, lng: 2, capturedAt: null })).toBe(true)
  })

  it('false when either is null', () => {
    expect(hasGps({ lat: null, lng: 2, capturedAt: null })).toBe(false)
    expect(hasGps({ lat: 1, lng: null, capturedAt: null })).toBe(false)
  })
})
