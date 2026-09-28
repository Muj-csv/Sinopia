/** FR-004: autosave the draft every 10s and on page hide, so a reload resumes it. */
import { useEffect, useRef } from 'react'
import { updateDraft, type Draft } from '../lib/draftStore'

const AUTOSAVE_INTERVAL_MS = 10_000

/**
 * Reported so the canvas can show "Draft kept on this device · 10:42", or say plainly that it
 * isn't being saved (Design Council #6 -- the artist must never silently lose work).
 */
export interface SaveResult {
  savedAt: number | null
  failed: boolean
}

/** Writes the draft and reports the outcome. IndexedDB can be unavailable or out of quota. */
export async function saveDraftPatch(
  draftId: string,
  patch: Partial<Omit<Draft, 'id' | 'createdAt'>>,
): Promise<SaveResult> {
  try {
    await updateDraft(draftId, patch)
    return { savedAt: Date.now(), failed: false }
  } catch {
    return { savedAt: null, failed: true }
  }
}

export function useAutosave(
  draftId: string | null,
  patch: Partial<Omit<Draft, 'id' | 'createdAt'>>,
  onResult?: (result: SaveResult) => void,
) {
  const patchRef = useRef(patch)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    patchRef.current = patch
  }, [patch])

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    if (draftId === null) return

    const save = () => {
      saveDraftPatch(draftId, patchRef.current).then((result) => onResultRef.current?.(result))
    }

    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [draftId])
}
