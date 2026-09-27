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
import { ReportDialog } from './ReportDialog'
import { RevealSlider } from './RevealSlider'
import { SameWallStrip } from './SameWallStrip'
import { SpotMap } from './SpotMap'
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

  useEffect(() => {
    if (id === undefined) return
    let cancelled = false
    supabase
      .from('frescoes')
      .select('*, profiles(display_name)')
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

  if (status === 'loading') {
    return <p className="draw-status">Loading...</p>
  }

  if (status === 'not-found' || fresco === null) {
    return (
      <div className="viewer-not-found">
        <p role="alert">This fresco isn't available.</p>
        <button type="button" onClick={() => navigate('/')}>
          Back to globe
        </button>
      </div>
    )
  }

  const canReport =
    session !== null && session.user.id !== fresco.owner_id && fresco.visibility === 'public'
  const date = fresco.captured_at ?? fresco.created_at

  return (
    <div className="fresco-viewer">
      {photoUrl !== null && compositeUrl !== null ? (
        <RevealSlider photoUrl={photoUrl} compositeUrl={compositeUrl} />
      ) : (
        <div className="viewer-image-placeholder" />
      )}

      <div className="viewer-details">
        <h2>{fresco.title}</h2>
        <p className="viewer-meta">
          {fresco.profiles?.display_name ?? 'An artist'}
          {fresco.place_name !== null && ` · ${fresco.place_name}`}
          {date !== null && ` · ${new Date(date).toLocaleDateString()}`}
        </p>
        {fresco.caption !== null && <p>{fresco.caption}</p>}
        {fresco.memory !== null && <p className="viewer-memory">{fresco.memory}</p>}
        {fresco.tags.length > 0 && (
          <ul className="viewer-tags">
            {fresco.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        {spot !== null && <SpotMap lng={spot.lng} lat={spot.lat} />}

        {canReport && (
          <button type="button" onClick={() => setReporting(true)}>
            Report
          </button>
        )}
        <Link to="/">Back to globe</Link>
      </div>

      {fresco.visibility === 'public' && (
        <div className="viewer-same-wall">
          <h3>Same Wall</h3>
          <SameWallStrip frescoId={fresco.id} />
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
  )
}
