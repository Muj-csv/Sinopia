/**
 * PHASE-3 task 5: sketch in, matching references out, grouped into
 * families. Loads the prebuilt index, ranks it against the confirmed
 * joints (src/pose/match.ts), groups into families (src/pose/families.ts),
 * and renders the signature panel, family tabs, and results grid.
 */
import { useEffect, useState } from 'react'
import { groupByFamily, type Family, type FamilyGroups } from '../pose/families'
import { rankCandidates, TOP_K_GRID, type Candidate } from '../pose/match'
import { computeSignature, type Joints } from '../pose/signature'
import { FamilyTabs } from './FamilyTabs'
import { pickDefaultFamily } from './familyOrder'
import { loadIndex, type IndexEntry } from './loadIndex'
import './Results.css'
import { ResultsGrid } from './ResultsGrid'
import { SignaturePanel } from './SignaturePanel'

type Status = 'loading' | 'ready' | 'empty' | 'error'

export function ResultsScreen({ queryJoints }: { queryJoints: Joints }) {
  const [status, setStatus] = useState<Status>('loading')
  const [groups, setGroups] = useState<FamilyGroups<IndexEntry> | null>(null)
  const [activeFamily, setActiveFamily] = useState<Family>('related')

  useEffect(() => {
    let cancelled = false

    loadIndex()
      .then((entries) => {
        if (cancelled) return
        const candidates: Candidate<IndexEntry>[] = entries.map((entry) => ({ entry, sig: entry.sig }))
        const ranked = rankCandidates(queryJoints, candidates)
        if (ranked.length === 0) {
          setStatus('empty')
          return
        }
        const grouped = groupByFamily(ranked)
        setGroups(grouped)
        setActiveFamily(pickDefaultFamily(grouped))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [queryJoints])

  if (status === 'loading') {
    return <p className="results-status">Searching the reference set...</p>
  }
  if (status === 'error') {
    return (
      <p className="results-status" role="alert">
        Couldn't load the reference set. Check your connection and try again.
      </p>
    )
  }
  if (status === 'empty' || groups === null) {
    return <p className="results-status">No matching references found. Try adjusting the joints.</p>
  }

  return (
    <div className="results-screen">
      <SignaturePanel signature={computeSignature(queryJoints)} />
      <FamilyTabs groups={groups} active={activeFamily} onSelect={setActiveFamily} />
      <ResultsGrid matches={groups[activeFamily].slice(0, TOP_K_GRID)} />
    </div>
  )
}
