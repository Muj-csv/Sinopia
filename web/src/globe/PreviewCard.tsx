/** DESIGN_BRIEF.md: PreviewCard -- thumb, title, artist, place, Open. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'
import type { GlobePoint } from './geoJson'

interface Details {
  place_name: string | null
  artist: string | null
}

export function PreviewCard({ point, onClose }: { point: GlobePoint; onClose: () => void }) {
  const navigate = useNavigate()
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [details, setDetails] = useState<Details | null>(null)

  useEffect(() => {
    frescoImageUrl('public', point.thumb_path).then(setThumbUrl)
    supabase
      .from('frescoes')
      .select('place_name, profiles(display_name)')
      .eq('id', point.id)
      .single()
      .then(({ data }) => {
        const profile = data?.profiles as unknown as { display_name: string } | null
        setDetails({ place_name: data?.place_name ?? null, artist: profile?.display_name ?? null })
      })
  }, [point])

  return (
    <div className="preview-card">
      <button type="button" className="preview-card-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {thumbUrl !== null ? (
        <img src={thumbUrl} alt={point.title} className="preview-card-thumb" />
      ) : (
        <div className="preview-card-thumb-placeholder" />
      )}
      <div className="preview-card-body">
        <strong>{point.title}</strong>
        {details?.artist != null && <span>{details.artist}</span>}
        {details?.place_name != null && <span>{details.place_name}</span>}
        <button type="button" onClick={() => navigate(`/f/${point.id}`)}>
          Open
        </button>
      </div>
    </div>
  )
}
