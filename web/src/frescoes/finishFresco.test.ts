import { describe, expect, it, vi } from 'vitest'
import { finishFresco, type FinishDeps, type FinishInput } from './finishFresco'

const OWNER = '11111111-1111-1111-1111-111111111111'
const FRESCO = '22222222-2222-2222-2222-222222222222'

function input(overrides: Partial<FinishInput> = {}): FinishInput {
  return {
    ownerId: OWNER,
    title: 'Shutter on Kalayaan Ave',
    caption: '',
    memory: '',
    tags: [],
    placeName: 'Angeles City',
    photo: new Blob(['photo']),
    drawing: new Blob(['drawing']),
    composite: new Blob(['composite']),
    thumb: new Blob(['thumb']),
    width: 1200,
    height: 1600,
    capturedAt: null,
    location: { lat: 15.145, lng: 120.593 },
    visibility: 'public',
    precision: 'neighborhood',
    ...overrides,
  }
}

function deps(over: { saveOk?: boolean; publishOk?: boolean } = {}): FinishDeps & {
  save: ReturnType<typeof vi.fn>
  publish: ReturnType<typeof vi.fn>
} {
  const save = vi.fn().mockResolvedValue(
    over.saveOk === false
      ? { ok: false, frescoId: FRESCO, error: 'upload failed' }
      : { ok: true, frescoId: FRESCO },
  )
  const publish = vi.fn().mockResolvedValue(
    over.publishOk === false ? { ok: false, error: 'storage denied' } : { ok: true },
  )
  return { save, publish } as never
}

describe('finishFresco', () => {
  /**
   * The regression this file exists for. The shipped bug passed the fresco id as the owner and the
   * user id as the fresco, so every publish built wrong storage paths and updated no row. Both are
   * uuids, so only an assertion on which id went where can catch it.
   */
  it('publishes the fresco that was just saved, under its owner', async () => {
    const d = deps()
    await finishFresco(input(), d)

    expect(d.publish).toHaveBeenCalledTimes(1)
    const [ref, precision] = d.publish.mock.calls[0]
    expect(ref).toEqual({ ownerId: OWNER, frescoId: FRESCO })
    expect(precision).toBe('neighborhood')
  })

  it('passes the chosen precision through', async () => {
    const d = deps()
    await finishFresco(input({ precision: 'exact' }), d)
    expect(d.publish.mock.calls[0][1]).toBe('exact')
  })

  it('reports the fresco as published', async () => {
    const d = deps()
    expect(await finishFresco(input(), d)).toEqual({ status: 'published', frescoId: FRESCO })
  })

  it('does not publish a fresco kept to the Sketchbook', async () => {
    const d = deps()
    const outcome = await finishFresco(input({ visibility: 'private' }), d)

    expect(d.publish).not.toHaveBeenCalled()
    expect(outcome).toEqual({ status: 'kept', frescoId: FRESCO })
  })

  it('does not try to publish when the save failed', async () => {
    const d = deps({ saveOk: false })
    const outcome = await finishFresco(input(), d)

    expect(d.publish).not.toHaveBeenCalled()
    expect(outcome).toEqual({ status: 'save-failed', error: 'upload failed' })
  })

  it('distinguishes a publish failure from a save failure, and keeps the fresco id', async () => {
    const d = deps({ publishOk: false })
    const outcome = await finishFresco(input(), d)

    // The fresco exists and is private: the caller can delete the local draft and point the artist
    // at the Sketchbook, which would be wrong if the save itself had failed.
    expect(outcome).toEqual({
      status: 'publish-failed',
      frescoId: FRESCO,
      error: 'storage denied',
    })
  })

  it('does not hand visibility or precision to saveFresco, which always writes private', async () => {
    const d = deps()
    await finishFresco(input(), d)

    const saved = d.save.mock.calls[0][0]
    expect(saved).not.toHaveProperty('visibility')
    expect(saved).not.toHaveProperty('precision')
    expect(saved.ownerId).toBe(OWNER)
  })
})
