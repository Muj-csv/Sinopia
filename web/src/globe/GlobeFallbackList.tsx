/**
 * Globe state "map fails" (SCREENS.md): a notice plus a plain list of frescoes, so discovery still
 * works without WebGL, without tiles, or on a device MapLibre won't run on.
 *
 * It renders from the same rpc('globe_points') rows the map would have plotted, which is why the
 * fetch in GlobePage is independent of whether the map ever loads.
 */
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Icon } from '../ui/Icon'
import type { GlobePoint } from './geoJson'

/** Public thumbnails have a stable public URL, so the list needs no per-row signing round trip. */
function thumbUrl(path: string): string {
  return supabase.storage.from('globe').getPublicUrl(path).data.publicUrl
}

export function GlobeFallbackList({
  points,
  dataFailed,
}: {
  points: readonly GlobePoint[]
  /** True when the fresco fetch failed too, so the list is empty for a different reason. */
  dataFailed: boolean
}) {
  return (
    <div className="fallback-list">
      <div className="notice" role="alert">
        <Icon name="warn" />
        <div>
          <b>The map couldn&apos;t load.</b>{' '}
          {dataFailed
            ? 'The gallery is waking up too. Try again in a moment.'
            : 'You can still open frescoes from this list.'}
        </div>
      </div>

      {points.length === 0 && !dataFailed ? (
        <p className="t-small">Nobody has published a fresco yet.</p>
      ) : (
        <div className="options">
          {points.map((point) => (
            <Link key={point.id} className="option" to={`/f/${point.id}`}>
              <img className="option-thumb" src={thumbUrl(point.thumb_path)} alt="" />
              <span className="option-text">
                <span className="option-title">{point.title}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
