/** SearchPill (DESIGN_BRIEF.md): idle/typing/loading/no-results, Photon-backed. */
import { useEffect, useState } from 'react'
import { searchPlaces, type PlaceResult } from './photonSearch'

const DEBOUNCE_MS = 400

export function PlaceSearch({ onSelect }: { onSelect: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === '') {
      setResults([])
      return
    }
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

  return (
    <div className="place-search">
      <input
        type="search"
        placeholder="Search a place"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="place-search-status">Searching...</p>}
      {!loading && results.length > 0 && (
        <ul className="place-search-results">
          {results.map((r) => (
            <li key={`${r.lng},${r.lat}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r)
                  setQuery('')
                  setResults([])
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
