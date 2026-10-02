/**
 * The Finish step's save-then-publish sequence, lifted out of the form so it can be tested.
 *
 * It lived inline in FinishForm, where the only thing exercising it was a person clicking Publish.
 * That is how the swapped-id call reached production: saveFresco and publishFresco each had tests,
 * but nothing tested the wiring between them, which is where the mistake was.
 */
import { publishFresco } from './publishFresco'
import { saveFresco, type SaveFrescoInput } from './saveFresco'
import type { PinPrecision, Visibility } from './fresco'

export type FinishOutcome =
  /** Saved private; there is nothing else to do. `unlinked`: see below. */
  | { status: 'kept'; frescoId: string; unlinked?: true }
  /** Saved and now on the globe. */
  | { status: 'published'; frescoId: string; unlinked?: true }
  /** Nothing was written. The local draft must be kept so the artist can retry. */
  | { status: 'save-failed'; error: string }
  /** The fresco exists and is private; only the publish step failed. The draft can go. */
  | { status: 'publish-failed'; frescoId: string; error: string }

export interface FinishInput extends SaveFrescoInput {
  visibility: Visibility
  precision: PinPrecision
}

/** Injected so the sequence can be tested without a Supabase client. */
export interface FinishDeps {
  save: typeof saveFresco
  publish: typeof publishFresco
}

export async function finishFresco(
  { visibility, precision, ...input }: FinishInput,
  deps: FinishDeps = { save: saveFresco, publish: publishFresco },
): Promise<FinishOutcome> {
  let saved = await deps.save(input)
  // Draw This Wall: if the source was unpublished or reported while this was being drawn, the
  // database refuses the link (42501). The artwork is still the artist's own, so save it without
  // the link rather than leave them unable to save at all -- and say so.
  let unlinked: true | undefined
  if (!saved.ok && saved.code === '42501' && input.sourceFrescoId) {
    saved = await deps.save({ ...input, sourceFrescoId: null })
    unlinked = saved.ok ? true : undefined
  }
  if (!saved.ok) {
    return { status: 'save-failed', error: saved.error ?? 'Saved as a draft on this device' }
  }

  if (visibility !== 'public') {
    return { status: 'kept', frescoId: saved.frescoId, unlinked }
  }

  // saveFresco always writes private, so publishing is a separate second step: if it fails the
  // artist still has a saved fresco to publish from the Sketchbook rather than lost work.
  const published = await deps.publish(
    { ownerId: input.ownerId, frescoId: saved.frescoId },
    precision,
  )
  if (!published.ok) {
    return {
      status: 'publish-failed',
      frescoId: saved.frescoId,
      error: published.error ?? 'Publishing failed',
    }
  }

  return { status: 'published', frescoId: saved.frescoId, unlinked }
}
