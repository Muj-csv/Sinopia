/**
 * PHASE-4 task 2 (FR-010): '/f/:id'. Composite + Reality<->Drawing slider,
 * title/artist/place/date/caption/memory/tags, a small map of the public
 * point, Same Wall, Report.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { loadGlobePoints } from '../globe/loadGlobePoints'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'
import type { FrescoRow } from '../sketchbook/frescoRow'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import { ReportDialog } from './ReportDialog'
import { RevealSlider } from './RevealSlider'
import {
  loadResponseSource,
  loadResponses,
  responseCredit,
  type ResponseSource,
} from '../frescoes/responses'
import { placeHref } from '../place/placeHistory'
import { FrescoStrip, SameWallStrip } from './SameWallStrip'
import { SpotMap } from './SpotMap'
import { StreetLevelPanel } from './StreetLevelPanel'
import { formatWeather, fetchWeatherAt, type WeatherResult } from './weather'
import './viewer.css'

type FrescoWithArtist = FrescoRow & { profiles: { display_name: string } | null }
type Status = 'loading' | 'ready' | 'not-found'

export function FrescoViewer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const [status, setStatus] = useState<Status>('loading')
  const [fresco, setFresco] = useState<FrescoWithArtist | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)
  const [spot, setSpot] = useState<{ lng: number; lat: number } | null>(null)
  const [weather, setWeather] = useState<WeatherResult | null>(null)
  // Draw This Wall: what this fresco responds to. 'gone' = the link exists but the viewer can no
  // longer see the source (unpublished or hidden), so the credit degrades instead of linking.
  // Keyed by fresco: /f/:id keeps this component mounted when a link opens another fresco.
  const [responseSource, setResponseSource] = useState<{
    frescoId: string
    source: ResponseSource | 'gone'
  } | null>(null)

  useEffect(() => {
    if (id === undefined) return
    let cancelled = false
    supabase
      .from('frescoes')
      .select('*, profiles!frescoes_owner_id_fkey(display_name)')
      .eq('id', id)
      .single()
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error || data === null) {
          setStatus('not-found')
          return
        }
        const row = data as unknown as FrescoWithArtist
        setFresco(row)
        const [photo, composite] = await Promise.all([
          frescoImageUrl(row.visibility, row.photo_path),
          frescoImageUrl(row.visibility, row.composite_path),
        ])
        if (cancelled) return
        setPhotoUrl(photo)
        setCompositeUrl(composite)
        setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (fresco === null || fresco.visibility !== 'public') return
    let cancelled = false
    loadGlobePoints().then(({ points }) => {
      if (cancelled) return
      const point = points.find((p) => p.id === fresco.id)
      if (point !== undefined) setSpot({ lng: point.lng, lat: point.lat })
    })
    return () => {
      cancelled = true
    }
  }, [fresco])

  useEffect(() => {
    if (fresco === null) return
    const sourceId = fresco.source_fresco_id
    if (sourceId === undefined || sourceId === null) return
    let cancelled = false
    loadResponseSource(sourceId).then((source) => {
      if (!cancelled) setResponseSource({ frescoId: fresco.id, source: source ?? 'gone' })
    })
    return () => {
      cancelled = true
    }
  }, [fresco])

  useEffect(() => {
    if (spot === null || fresco === null) return
    const date = fresco.captured_at ?? fresco.created_at
    let cancelled = false
    fetchWeatherAt(spot.lat, spot.lng, date).then((result) => {
      if (!cancelled) setWeather(result)
    })
    return () => {
      cancelled = true
    }
  }, [spot, fresco])

  if (status === 'loading') {
    return (
      <>
        <FlowBar title="Fresco" exit="back" />
        <p className="page t-small">Loading&hellip;</p>
      </>
    )
  }

  if (status === 'not-found' || fresco === null) {
    return (
      <>
        <FlowBar title="Fresco" exit="back" />
        <div className="scroll lined">
          <section className="page empty">
            <h2>This fresco isn&apos;t available.</h2>
            <p>It may have been unpublished, or the link may be wrong.</p>
            <button type="button" className="btn-o" onClick={() => navigate('/')}>
              Back to your Sinopia
            </button>
          </section>
        </div>
      </>
    )
  }

  const canReport =
    session !== null && session.user.id !== fresco.owner_id && fresco.visibility === 'public'
  const date = fresco.captured_at ?? fresco.created_at
  // Only a public, unreported fresco can be answered -- the rule 0006's insert policy enforces.
  const canRespond = fresco.visibility === 'public' && (fresco.moderation ?? 'ok') === 'ok'
  const credit = responseSource?.frescoId === fresco.id ? responseSource.source : null

  return (
    <>
      <FlowBar title={fresco.place_name ?? 'Fresco'} exit="back">
        {canReport && (
          <button type="button" className="ibtn" onClick={() => setReporting(true)}>
            <Icon name="flag" label="Report this fresco" />
          </button>
        )}
      </FlowBar>

      <div className="scroll">
        <div className="fresco-viewer">
          {photoUrl !== null && compositeUrl !== null ? (
            <RevealSlider photoUrl={photoUrl} compositeUrl={compositeUrl} />
          ) : (
            <div className="viewer-image-placeholder" />
          )}

          <div className="viewer-details">
            <h1 className="viewer-title">{fresco.title}</h1>
            <p className="viewer-meta">
              {/* The artist's name is the way into their Sinopia. Discovery here is "I liked this,
                  show me their world", not a follow button (Update 1.2 §17). */}
              <Link className="link" to={`/s/${fresco.owner_id}`}>
                {fresco.profiles?.display_name ?? 'An artist'}
              </Link>
              {fresco.place_name !== null && ` · ${fresco.place_name}`}
              {date !== null && ` · ${new Date(date).toLocaleDateString()}`}
              {weather !== null && ` · ${formatWeather(weather)}`}
            </p>
            {credit === 'gone' ? (
              <p className="viewer-meta">A response to a fresco that isn&apos;t shared any more.</p>
            ) : (
              credit !== null && (
                <p className="viewer-meta">
                  <Link className="link" to={`/f/${credit.id}`}>
                    {responseCredit(credit)}
                  </Link>
                </p>
              )
            )}
            {fresco.caption !== null && <p>{fresco.caption}</p>}
            {fresco.memory !== null && <p className="viewer-memory">{fresco.memory}</p>}
            {fresco.tags.length > 0 && (
              <ul className="viewer-tags">
                {fresco.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}

            {/* Outlined, not yellow: the viewer's yellow is reserved for the slider thumb
                (SCREENS.md). Signed-out artists meet the usual sign-in gate on /new. */}
            {canRespond && (
              <div>
                <Link className="btn-o" to={`/new?from=${fresco.id}`}>
                  <Icon name="brush" />
                  Draw it your way
                </Link>
              </div>
            )}

            {/* CLAUDE.md: a traced reference can carry an attribution duty, so whatever was
                pinned while drawing travels with the fresco rather than staying implicit. */}
            {fresco.references_used.length > 0 && (
              <div className="viewer-references">
                <h3>References</h3>
                <ul>
                  {fresco.references_used.map((ref) => (
                    <li key={ref.id}>
                      <a href={ref.foreign_landing_url} target="_blank" rel="noreferrer noopener">
                        {ref.title}
                      </a>{' '}
                      · {ref.license.toUpperCase()}
                      {ref.license_version ? ` ${ref.license_version}` : ''} · {ref.creator}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {spot !== null && <SpotMap lng={spot.lng} lat={spot.lat} />}

            {/* FR-015: never for neighborhood precision -- would reveal the exact spot. */}
            {spot !== null && fresco.pin_precision === 'exact' && (
              <StreetLevelPanel lat={spot.lat} lng={spot.lng} />
            )}

            <p>
              <Link className="link" to="/">
                Back to your Sinopia
              </Link>
            </p>
          </div>

          {fresco.visibility === 'public' ? (
            <div className="viewer-same-wall">
              <h2>Same Wall</h2>
              <SameWallStrip frescoId={fresco.id} />
              {spot !== null && (
                <p>
                  <Link
                    className="link"
                    to={placeHref({ lat: spot.lat, lng: spot.lng, name: fresco.place_name })}
                  >
                    Place history
                  </Link>
                </p>
              )}
              {/* Kept apart from Same Wall: a response is linked by intent, not distance, and a
                  neighbourhood-snapped one can land well outside the 50 m radius (DTW-FR-07). */}
              <h2>Responses</h2>
              <FrescoStrip
                frescoId={fresco.id}
                load={loadResponses}
                empty="Nobody has drawn their own version of this yet."
              />
            </div>
          ) : (
            <div className="viewer-same-wall">
              <h2>Same Wall</h2>
              <p className="t-small">
                Other frescoes from this spot appear here once you publish this one.
              </p>
            </div>
          )}

          {reporting && session !== null && (
            <ReportDialog
              frescoId={fresco.id}
              reporterId={session.user.id}
              onClose={() => setReporting(false)}
            />
          )}
        </div>
      </div>
    </>
  )
}
