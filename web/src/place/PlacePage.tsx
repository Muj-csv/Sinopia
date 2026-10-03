/**
 * Place History · '/place?lat=&lng=&name=' (PRD §9, "Place Timeline"): every public fresco within
 * PLACE_RADIUS_M of a public point, newest first by when the place was seen, grouped by year.
 *
 * "Same place" is the whole page; a response is marked on its card, and Same Wall stays the
 * viewer's 50 m strip -- the three are never merged into one list (PT-FR-06). Add yours is this
 * screen's one yellow button. No ranking of any kind: order is time, nothing else.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { responseCredit } from '../frescoes/responses'
import '../sketchbook/sketchbook.css'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import './place.css'
import {
  PLACE_RADIUS_M,
  groupByYear,
  loadPlaceSummary,
  loadPlaceTimeline,
  newAtPlaceHref,
  nextCursor,
  parsePlace,
  yearSpan,
  type Cursor,
  type Place,
  type PlaceFresco,
  type PlaceSummary,
} from './placeHistory'

type Status = 'loading' | 'ready' | 'error'
type Row = PlaceFresco & { thumbUrl: string | null; compositeUrl: string | null }

async function withUrls(rows: PlaceFresco[]): Promise<Row[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      thumbUrl: await frescoImageUrl('public', row.thumb_path),
      compositeUrl: await frescoImageUrl('public', row.composite_path),
    })),
  )
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function PlaceHistory({ place }: { place: Place }) {
  const [summary, setSummary] = useState<PlaceSummary | null>(null)
  const [summaryStatus, setSummaryStatus] = useState<Status>('loading')
  const [year, setYear] = useState<number | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [listStatus, setListStatus] = useState<Status>('loading')
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Up to two cards picked for side-by-side; kept as rows so a year switch doesn't drop them.
  const [compare, setCompare] = useState<Row[]>([])

  useEffect(() => {
    let cancelled = false
    loadPlaceSummary(place).then((result) => {
      if (cancelled) return
      setSummary(result)
      setSummaryStatus(result === null ? 'error' : 'ready')
    })
    return () => {
      cancelled = true
    }
  }, [place, attempt])

  useEffect(() => {
    let cancelled = false
    loadPlaceTimeline(place, { year, before: null }).then(async (page) => {
      if (cancelled) return
      if (page === null) {
        setListStatus('error')
        return
      }
      const loaded = await withUrls(page)
      if (cancelled) return
      setRows(loaded)
      setCursor(nextCursor(page))
      setListStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [place, year, attempt])

  const chooseYear = (next: number | null) => {
    if (next === year) return
    setYear(next)
    setRows([])
    setCursor(null)
    setListStatus('loading')
  }

  const retry = () => {
    setSummaryStatus('loading')
    setListStatus('loading')
    setAttempt((n) => n + 1)
  }

  const loadMore = async () => {
    if (cursor === null) return
    setLoadingMore(true)
    const page = await loadPlaceTimeline(place, { year, before: cursor })
    if (page !== null) {
      const loaded = await withUrls(page)
      setRows((prev) => [...prev, ...loaded])
      setCursor(nextCursor(page))
    }
    setLoadingMore(false)
  }

  const toggleCompare = (row: Row) => {
    setCompare((prev) =>
      prev.some((r) => r.id === row.id)
        ? prev.filter((r) => r.id !== row.id)
        : prev.length < 2
          ? [...prev, row]
          : prev,
    )
  }
  // Earlier on the left: the comparison reads forward through time.
  const comparing = [...compare].sort((a, b) => a.seen_at.localeCompare(b.seen_at))

  const name = place.name ?? summary?.place_name ?? null
  const failed = summaryStatus === 'error' || listStatus === 'error'
  const count = summary?.fresco_count ?? 0
  const span = summary === null ? null : yearSpan(summary)

  return (
    <>
      <FlowBar title={name ?? 'Place history'} exit="back" />
      <div className="scroll">
        <div className="page place-history">
          <header className="place-head">
            <p className="t-label">Place history</p>
            {summary !== null && count > 0 && (
              <>
                <p className="place-summary">
                  {plural(count, 'fresco', 'frescoes')} ·{' '}
                  {plural(summary.artist_count, 'artist', 'artists')}
                  {span !== null && ` · ${span}`}
                </p>
                {summary.earliest !== null && summary.latest !== null && count > 1 && (
                  <p className="t-small">
                    First seen {new Date(summary.earliest).toLocaleDateString()} · most recently{' '}
                    {new Date(summary.latest).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
            <Link className="btn-y" to={newAtPlaceHref({ ...place, name })}>
              <Icon name="plus" />
              Add yours
            </Link>
          </header>

          {failed && (
            <div className="notice danger" role="alert">
              <Icon name="warn" />
              <span>This place&apos;s history couldn&apos;t load.</span>
              <button type="button" className="btn-o" onClick={retry}>
                Try again
              </button>
            </div>
          )}

          {summary !== null && summary.years.length > 1 && (
            <div className="place-years" role="group" aria-label="Show one year">
              <button
                type="button"
                className="chip"
                aria-pressed={year === null}
                onClick={() => chooseYear(null)}
              >
                {year === null && <Icon name="check" />}
                All years
              </button>
              {summary.years.map((y) => (
                <button
                  key={y}
                  type="button"
                  className="chip t-num"
                  aria-pressed={year === y}
                  onClick={() => chooseYear(y)}
                >
                  {year === y && <Icon name="check" />}
                  {y}
                </button>
              ))}
            </div>
          )}

          {comparing.length === 1 && (
            <p className="t-small" role="status">
              Pick one more fresco to see them side by side.
            </p>
          )}
          {comparing.length === 2 && (
            <section className="place-compare" aria-label="Two frescoes side by side">
              <div className="place-compare-head">
                <h2>Side by side</h2>
                <button type="button" className="btn-o" onClick={() => setCompare([])}>
                  Done comparing
                </button>
              </div>
              <div className="place-compare-grid">
                {comparing.map((r) => (
                  <figure key={r.id}>
                    {r.compositeUrl !== null ? (
                      <img src={r.compositeUrl} alt={r.title} />
                    ) : (
                      <div className="thumb" />
                    )}
                    <figcaption>
                      <strong className="t-num">{r.seen_year}</strong> · {r.title} · {r.artist}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {listStatus === 'loading' && (
            <p className="t-small" role="status">
              Loading&hellip;
            </p>
          )}

          {listStatus === 'ready' && summaryStatus === 'ready' && count === 0 && (
            <section className="empty">
              <h2>No frescoes here yet.</h2>
              <p>Nobody has published one within {PLACE_RADIUS_M} m of this spot.</p>
            </section>
          )}

          {listStatus === 'ready' &&
            groupByYear(rows).map((group) => (
              <section key={group.year} className="shelf">
                <div className="shelf-head">
                  <h2 className="t-num">{group.year}</h2>
                </div>
                <div className="shelf-strip">
                  {group.rows.map((r) => {
                    const picked = compare.some((c) => c.id === r.id)
                    return (
                      <div key={r.id} className="card place-card">
                        <Link className="place-card-link" to={`/f/${r.id}`}>
                          {r.thumbUrl !== null ? (
                            <img src={r.thumbUrl} alt="" loading="lazy" />
                          ) : (
                            <div className="thumb" />
                          )}
                          <span className="title">{r.title}</span>
                        </Link>
                        <span className="meta">
                          {r.artist} · {new Date(r.seen_at).toLocaleDateString()}
                        </span>
                        {r.source_fresco_id !== null && (
                          <span className="t-small">
                            {r.source_title !== null
                              ? responseCredit({
                                  artist: r.source_artist ?? 'An artist',
                                  title: r.source_title,
                                })
                              : 'A response'}
                          </span>
                        )}
                        <button
                          type="button"
                          className="chip"
                          aria-pressed={picked}
                          disabled={!picked && compare.length >= 2}
                          onClick={() => toggleCompare(r)}
                        >
                          {picked && <Icon name="check" />}
                          Compare
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

          {listStatus === 'ready' && count === 1 && (
            <p className="t-small">Only one fresco here so far.</p>
          )}

          {cursor !== null && (
            <button type="button" className="btn-o" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export function PlacePage() {
  const [params] = useSearchParams()
  // Memoised on the params object, which only changes on navigation, so the effects inside don't
  // refetch on every render.
  const place = useMemo(() => parsePlace(params), [params])

  if (place === null) {
    return (
      <>
        <FlowBar title="Place history" exit="back" />
        <div className="scroll">
          <section className="page empty">
            <h2>This place isn&apos;t available.</h2>
            <p>The link is missing its location.</p>
            <Link className="btn-o" to="/">
              Back to your Sinopia
            </Link>
          </section>
        </div>
      </>
    )
  }

  // Keyed by the place, so moving to another place starts its history fresh.
  return <PlaceHistory key={`${place.lat},${place.lng}`} place={place} />
}
