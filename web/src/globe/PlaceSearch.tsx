/** SearchPill (DESIGN_BRIEF.md): idle/typing/loading/no-results, Photon-backed. */
import { useEffect, useId, useState } from 'react'
import { Icon } from '../ui/Icon'
import { searchPlaces, type PlaceResult } from './photonSearch'

const DEBOUNCE_MS = 400

export function PlaceSearch({ onSelect }: { onSelect: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  // The field has no visible <label>: the magnifier carries the meaning, so the label is attached
  // here instead of left to the placeholder, which screen readers treat as a hint rather than a name.
  const inputId = useId()

  useEffect(() => {
    const trimmed = query.trim()
    // Nothing to search when empty -- render already hides results via the
    // `query.trim() !== ''` check below, so stale `results` left over from a
    // prior query is harmless.
    if (trimmed === '') return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      searchPlaces(trimmed).then((found) => {
        if (!cancelled) {
          setResults(found)
          setLoading(false)
        }
      })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const clear = () => {
    setQuery('')
    setResults([])
  }

  const searched = !loading && query.trim() !== ''

  return (
    <div className="place-search">
      <div className="place-search-field">
        <label className="place-search-icon" htmlFor={inputId}>
          <Icon name="search" label="Search a place" />
        </label>
        <input
          id={inputId}
          type="search"
          placeholder="Search a place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Only once there is something to clear, so the field is not permanently two icons. */}
        {query !== '' && (
          <button type="button" className="place-search-clear" onClick={clear}>
            <Icon name="x" label="Clear the search" />
          </button>
        )}
      </div>
      {loading && <p className="place-search-status">Searching&hellip;</p>}
      {/* SCREENS.md gives the empty result exactly one line. Without it the field just goes quiet,
          which reads as a broken search rather than a place nobody has heard of. */}
      {searched && results.length === 0 && (
        <p className="place-search-status">No place by that name.</p>
      )}
      {searched && results.length > 0 && (
        <ul className="place-search-results">
          {results.map((r) => (
            <li key={`${r.lng},${r.lat}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r)
                  clear()
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
