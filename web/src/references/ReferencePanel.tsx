/**
 * PHASE-2 task 1-4: reference panel (side panel >= md, bottom sheet on
 * phone via CSS). Search, results grid, pin one, enlarge, angle chips,
 * states per docs/design/UX_MAP.md's Reference panel row.
 */
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../ui/Icon'
import './references.css'
import { searchReferences, type Reference } from './referencesClient'
import { useDebouncedValue } from './useDebouncedValue'

const MAX_QUERY_LENGTH = 60
const SUGGESTED_WORDS = ['fire hydrant', 'cat', 'bicycle', 'tree']
const ANGLE_CHIPS = ['side view', 'from above', 'close-up']

type Status = 'loading' | 'results' | 'empty' | 'error' | 'rate-limited'

export function ReferencePanel({
  onClose,
  pinned,
  onPin,
}: {
  onClose: () => void
  pinned: Reference | null
  onPin: (reference: Reference | null) => void
}) {
  const [query, setQuery] = useState('')
  const [angleSuffix, setAngleSuffix] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query)
  const [status, setStatus] = useState<Status>('empty')
  const [results, setResults] = useState<Reference[]>([])
  const [enlarged, setEnlarged] = useState<Reference | null>(null)

  const effectiveQuery = useMemo(
    () => (angleSuffix !== null ? `${debouncedQuery} ${angleSuffix}` : debouncedQuery),
    [debouncedQuery, angleSuffix],
  )
  const trimmedQuery = effectiveQuery.trim()
  const idle = trimmedQuery === ''

  useEffect(() => {
    // Nothing to fetch when idle -- render already hides the results/status
    // blocks via `idle`, so stale `results`/`status` from a prior query are
    // harmless left as-is.
    if (trimmedQuery === '') return
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) setStatus('loading')
        return searchReferences(trimmedQuery)
      })
      .then((result) => {
        if (cancelled) return
        if (result.status === 'ok') {
          setResults(result.results)
          setStatus(result.results.length === 0 ? 'empty' : 'results')
        } else {
          setResults([])
          setStatus(result.status)
        }
      })
    return () => {
      cancelled = true
    }
  }, [trimmedQuery])

  const retry = () => {
    setStatus('loading')
    searchReferences(trimmedQuery).then((result) => {
      if (result.status === 'ok') {
        setResults(result.results)
        setStatus(result.results.length === 0 ? 'empty' : 'results')
      } else {
        setResults([])
        setStatus(result.status)
      }
    })
  }

  return (
    <div className="reference-panel">
      <div className="reference-panel-header">
        <h2>Reference</h2>
        <button type="button" className="ibtn" onClick={onClose}>
          <Icon name="x" label="Close reference panel" />
        </button>
      </div>

      <input
        type="search"
        className="reference-search"
        placeholder="Search anything you're drawing"
        maxLength={MAX_QUERY_LENGTH}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setAngleSuffix(null)
        }}
      />

      {results.length > 0 && (
        <div className="reference-angle-chips">
          {ANGLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              aria-pressed={angleSuffix === chip}
              className="chip"
              onClick={() => setAngleSuffix((s) => (s === chip ? null : chip))}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {idle && <p className="reference-status">try: {SUGGESTED_WORDS.join(', ')}</p>}

      {!idle && status === 'loading' && (
        <div className="reference-grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="reference-skeleton" />
          ))}
        </div>
      )}

      {!idle && status === 'error' && (
        <p className="reference-status" role="alert">
          References are unavailable right now.{' '}
          <button type="button" className="link" onClick={retry}>
            Retry
          </button>
        </p>
      )}

      {!idle && status === 'rate-limited' && (
        <p className="reference-status" role="alert">
          Too many searches -- try again in a moment.
        </p>
      )}

      {!idle && status === 'empty' && (
        <p className="reference-status">No results for that search.</p>
      )}

      {!idle && status === 'results' && (
        <div className="reference-grid">
          {results.map((r) => (
            <div key={r.id} className="reference-card">
              <button type="button" className="reference-thumb" onClick={() => setEnlarged(r)}>
                <img src={r.thumbnail} alt={r.title} loading="lazy" />
              </button>
              <button
                type="button"
                className="chip reference-pin"
                aria-pressed={pinned?.id === r.id}
                onClick={() => onPin(pinned?.id === r.id ? null : r)}
              >
                <Icon name="pin" />
                {pinned?.id === r.id ? 'Pinned' : 'Pin'}
              </button>
              <a
                className="reference-license"
                href={r.foreign_landing_url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {r.license.toUpperCase()}
                {r.license_version ? ` ${r.license_version}` : ''} · {r.creator}
              </a>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <p className="reference-footer">
          License information is as reported by the source; check it before reuse.
        </p>
      )}

      {enlarged !== null && (
        <div className="reference-lightbox" onClick={() => setEnlarged(null)}>
          <img src={enlarged.url} alt={enlarged.title} />
        </div>
      )}
    </div>
  )
}
