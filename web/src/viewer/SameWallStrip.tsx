/** DESIGN_BRIEF.md SameWallStrip: nearest first, up to 24; loading/items/empty. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'

interface SameWallRow {
  id: string
  title: string
  thumb_path: string
  distance_m: number
}

type Status = 'loading' | 'items' | 'empty'

export function SameWallStrip({ frescoId }: { frescoId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [rows, setRows] = useState<(SameWallRow & { thumbUrl: string | null })[]>([])

  useEffect(() => {
    let cancelled = false
    supabase
      .rpc('same_wall', { p_fresco: frescoId, p_radius_m: 50 })
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error || data === null || data.length === 0) {
          setStatus('empty')
          return
        }
        const withUrls = await Promise.all(
          (data as SameWallRow[]).map(async (row) => ({
            ...row,
            thumbUrl: await frescoImageUrl('public', row.thumb_path),
          })),
        )
        if (cancelled) return
        setRows(withUrls)
        setStatus('items')
      })
    return () => {
      cancelled = true
    }
  }, [frescoId])

  if (status === 'loading') {
    return (
      <div className="same-wall-strip" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="same-wall-skeleton" />
        ))}
      </div>
    )
  }

  if (status === 'empty') {
    return <p className="same-wall-empty">Nobody else has drawn this wall yet.</p>
  }

  return (
    <div className="same-wall-strip">
      {rows.map((row) => (
        <Link key={row.id} to={`/f/${row.id}`} className="same-wall-item">
          {row.thumbUrl !== null ? (
            <img src={row.thumbUrl} alt={row.title} loading="lazy" />
          ) : (
            <div className="same-wall-thumb-placeholder" />
          )}
        </Link>
      ))}
    </div>
  )
}
