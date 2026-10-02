/**
 * DESIGN_BRIEF.md SameWallStrip: nearest first, up to 24; loading/items/empty.
 * `FrescoStrip` is that strip for any list of public frescoes, so Draw This Wall's Responses strip
 * looks and behaves the same as Same Wall.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StripRow } from '../frescoes/responses'
import { supabase } from '../lib/supabase'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'

type Status = 'loading' | 'items' | 'empty'

/** Loaders are module-level functions, so the effect below doesn't refetch on every render. */
type Loader = (frescoId: string) => Promise<StripRow[] | null>

export function FrescoStrip({
  frescoId,
  load,
  empty,
}: {
  frescoId: string
  load: Loader
  empty: string
}) {
  const [status, setStatus] = useState<Status>('loading')
  const [rows, setRows] = useState<(StripRow & { thumbUrl: string | null })[]>([])

  useEffect(() => {
    let cancelled = false
    load(frescoId).then(async (data) => {
      if (cancelled) return
      if (data === null || data.length === 0) {
        setStatus('empty')
        return
      }
      const withUrls = await Promise.all(
        data.map(async (row) => ({
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
  }, [frescoId, load])

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
    return <p className="same-wall-empty">{empty}</p>
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

async function loadSameWall(frescoId: string): Promise<StripRow[] | null> {
  const { data, error } = await supabase.rpc('same_wall', { p_fresco: frescoId, p_radius_m: 50 })
  return error ? null : (data as StripRow[])
}

export function SameWallStrip({ frescoId }: { frescoId: string }) {
  return (
    <FrescoStrip
      frescoId={frescoId}
      load={loadSameWall}
      empty="Nobody else has drawn this wall yet."
    />
  )
}
