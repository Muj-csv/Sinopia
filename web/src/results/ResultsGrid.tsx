/** Results grid (PHASE-3 task 5). ARCHITECTURE.md §8: thumbnails are hotlinked,
 * never re-hosted; a broken thumbnail shows a placeholder plus the source link. */
import { useState } from 'react'
import type { RankedMatch } from '../pose/match'
import type { IndexEntry } from './loadIndex'

function ResultCard({ match }: { match: RankedMatch<IndexEntry> }) {
  const [broken, setBroken] = useState(false)
  const { entry, overall } = match
  const license = entry.license_version ? `${entry.license.toUpperCase()} ${entry.license_version}` : entry.license.toUpperCase()

  return (
    <a className="result-card" href={entry.landing} target="_blank" rel="noreferrer noopener">
      {broken ? (
        <div className="result-thumb-broken">Thumbnail unavailable — view source</div>
      ) : (
        <img src={entry.thumb} alt={entry.title} loading="lazy" onError={() => setBroken(true)} />
      )}
      <div className="result-card-meta">
        <span className="result-score">{Math.round(overall)}% pose geometry similarity</span>
        <span className="result-license">{license}</span>
        <span className="result-attribution" title={entry.attribution}>
          {entry.attribution}
        </span>
      </div>
    </a>
  )
}

export function ResultsGrid({ matches }: { matches: readonly RankedMatch<IndexEntry>[] }) {
  if (matches.length === 0) {
    return <p className="results-grid-empty">No references in this group.</p>
  }
  return (
    <div className="results-grid">
      {matches.map((match) => (
        <ResultCard key={match.entry.id} match={match} />
      ))}
    </div>
  )
}
