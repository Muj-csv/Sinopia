/** PHASE-3 task 5: the owner's frescoes, grouped by place or month; grid/carousel via CSS. */
import { useCallback, useEffect, useState } from 'react'
import { AuthGate } from '../auth/AuthGate'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { FrescoDetail } from './FrescoDetail'
import { frescoImageUrl } from './frescoImageUrl'
import { groupFrescoes, type FrescoRow } from './frescoRow'
import './sketchbook.css'

type Status = 'loading' | 'ready' | 'error'

function SketchbookGrid({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [rows, setRows] = useState<FrescoRow[]>([])
  const [thumbUrls, setThumbUrls] = useState<Record<string, string | null>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    const { data, error } = await supabase
      .from('frescoes')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error || data === null) {
      setStatus('error')
      return
    }
    setRows(data)
    setStatus('ready')

    const urls: Record<string, string | null> = {}
    await Promise.all(
      data.map(async (row: FrescoRow) => {
        urls[row.id] = await frescoImageUrl(row.visibility, row.thumb_path)
      }),
    )
    setThumbUrls(urls)
  }, [userId])

  useEffect(() => {
    // load() calls setState synchronously as its first line (fine from event
    // handlers, e.g. Retry) -- deferred a tick here so the effect body itself
    // doesn't call setState synchronously.
    void Promise.resolve().then(load)
  }, [load])

  if (status === 'loading') {
    return (
      <div className="sketchbook-grid" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="sketchbook-skeleton" />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p className="sketchbook-status" role="alert">
        Couldn't load your Sketchbook.{' '}
        <button type="button" onClick={load}>
          Retry
        </button>
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="sketchbook-status">
        Your Sketchbook is empty. Tap New to make your first fresco.
      </p>
    )
  }

  const openFresco = rows.find((r) => r.id === openId)

  return (
    <div className="sketchbook">
      {groupFrescoes(rows).map((group) => (
        <section key={group.label} className="sketchbook-group">
          <h3>{group.label}</h3>
          <div className="sketchbook-grid">
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="sketchbook-item"
                onClick={() => setOpenId(row.id)}
              >
                {thumbUrls[row.id] != null ? (
                  <img src={thumbUrls[row.id]!} alt={row.title} loading="lazy" />
                ) : (
                  <div className="sketchbook-thumb-placeholder" />
                )}
                <span>{row.title}</span>
                {row.visibility === 'public' && <span className="sketchbook-badge">Public</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      {openFresco !== undefined && (
        <FrescoDetail fresco={openFresco} onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  )
}

export function SketchbookPage() {
  const { session, loading } = useSession()
  if (loading) return <p className="draw-status">Loading...</p>

  return (
    <AuthGate message="Sign in to see your Sketchbook.">
      {session !== null && <SketchbookGrid userId={session.user.id} />}
    </AuthGate>
  )
}
