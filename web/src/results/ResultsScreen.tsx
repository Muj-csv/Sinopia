/** Results screen (Phase 3 task 5): signature panel, family tabs, results grid, loading/empty/error states. */
import { useEffect, useMemo, useState } from 'react'
import { type FamilyKey, groupFamilies } from '../pose/families'
import type { IndexEntry } from '../pose/match'
import { matchIndex } from '../pose/match'
import { loadIndex } from '../pose/loadIndex'
import { computeSignature } from '../pose/signature'
import type { Joints } from '../pose/signature'
import { FamilyTabs } from './FamilyTabs'
import { ResultsGrid } from './ResultsGrid'
import { SignaturePanel } from './SignaturePanel'

type IndexState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: IndexEntry[] }

interface Props {
  sketchJoints: Joints
}

export function ResultsScreen({ sketchJoints }: Props) {
  const [indexState, setIndexState] = useState<IndexState>({ status: 'loading' })
  const [family, setFamily] = useState<FamilyKey>('same_gesture')

  useEffect(() => {
    let cancelled = false
    loadIndex()
      .then((entries) => {
        if (!cancelled) setIndexState({ status: 'ready', entries })
      })
      .catch((err: Error) => {
        if (!cancelled) setIndexState({ status: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signature = useMemo(() => computeSignature(sketchJoints), [sketchJoints])

  const families = useMemo(() => {
    if (indexState.status !== 'ready') return undefined
    const { pool } = matchIndex(sketchJoints, indexState.entries)
    return groupFamilies(pool)
  }, [indexState, sketchJoints])

  return (
    <section aria-label="Results" className="results-screen">
      <SignaturePanel signature={signature} />

      {indexState.status === 'loading' && <p className="results-loading">Comparing against the reference set…</p>}

      {indexState.status === 'error' && (
        <p role="alert" className="results-error">
          {indexState.message} Try reloading the page.
        </p>
      )}

      {indexState.status === 'ready' && families !== undefined && (
        <>
          <FamilyTabs counts={families.counts} selected={family} onSelect={setFamily} />
          <ResultsGrid matches={families[family]} />
        </>
      )}
    </section>
  )
}
