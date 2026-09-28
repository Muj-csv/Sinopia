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
  /** Saved private; there is nothing else to do. */
  | { status: 'kept'; frescoId: string }
  /** Saved and now on the globe. */
  | { status: 'published'; frescoId: string }
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
  const saved = await deps.save(input)
  if (!saved.ok) {
    return { status: 'save-failed', error: saved.error ?? 'Saved as a draft on this device' }
  }

  if (visibility !== 'public') {
    return { status: 'kept', frescoId: saved.frescoId }
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

  return { status: 'published', frescoId: saved.frescoId }
}
