/** Globe preview card (SCREENS.md): thumb, title, artist, place, Open. Open is this screen's
 *  one yellow button -- New in the nav stays a paper button. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'
import { Icon } from '../ui/Icon'
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
      <button type="button" className="ibtn preview-card-close" onClick={onClose}>
        <Icon name="x" label="Close" />
      </button>
      {thumbUrl !== null ? (
        <img src={thumbUrl} alt={point.title} className="preview-card-thumb" />
      ) : (
        <div className="preview-card-thumb preview-card-thumb-placeholder" />
      )}
      <div className="preview-card-body">
        <strong className="preview-card-title">{point.title}</strong>
        {details?.artist != null && <span className="preview-card-meta">{details.artist}</span>}
        {details?.place_name != null && (
          <span className="preview-card-meta">{details.place_name}</span>
        )}
        <button type="button" className="btn-y" onClick={() => navigate(`/f/${point.id}`)}>
          Open
        </button>
      </div>
    </div>
  )
}
