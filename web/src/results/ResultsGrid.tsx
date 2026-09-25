/** Results grid with license badges (FR-004, FR-008). Wording per CLAUDE.md: "pose geometry similarity". */
import type { MatchResult } from '../pose/match'

interface Props {
  matches: MatchResult[]
}

export function ResultsGrid({ matches }: Props) {
  if (matches.length === 0) {
    return <p className="results-empty">No references match well enough to show here.</p>
  }

  return (
    <ul className="results-grid" aria-label="Matching references">
      {matches.map((m) => (
        <li key={m.entry.id} className="result-card">
          <a href={m.entry.landing} target="_blank" rel="noreferrer noopener">
            <img
              src={m.entry.thumb}
              alt={m.entry.title || 'Reference photo'}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </a>
          <div className="result-meta">
            <span className="result-score">{Math.round(m.overall)}% pose geometry similarity</span>
            <span className="license-badge">
              {m.entry.license}
              {m.entry.license_version ? ` ${m.entry.license_version}` : ''}
            </span>
            <span className="result-creator">{m.entry.creator}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
