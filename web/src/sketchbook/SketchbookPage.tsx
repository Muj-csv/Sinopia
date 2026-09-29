/** PHASE-3 task 5: the owner's frescoes, grouped by place or month.
 *
 * SCREENS.md "Sketchbook": a lined page. Heading, then who you're signed in as, then a Place/Month
 * segmented control. Underdrawings (unfinished drafts, on this device only) come first, then one
 * horizontal shelf per group. Not a bento or masonry grid, and drafts are never shown as frescoes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthGate } from '../auth/AuthGate'
import { listDrafts, type Draft } from '../lib/draftStore'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import { FrescoDetail } from './FrescoDetail'
import { frescoImageUrl } from './frescoImageUrl'
import { groupFrescoes, type FrescoRow, type GroupMode } from './frescoRow'
import './sketchbook.css'

type Status = 'loading' | 'ready' | 'error'

/** The unfinished drafts shelf. Drafts live only on this device, so it says so. */
function UnderdrawingsShelf({ drafts }: { drafts: Draft[] }) {
  const navigate = useNavigate()
  const thumbs = useMemo(() => drafts.map((d) => URL.createObjectURL(d.thumb)), [drafts])
  useEffect(() => {
    return () => thumbs.forEach((url) => URL.revokeObjectURL(url))
  }, [thumbs])

  if (drafts.length === 0) return null

  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2>Underdrawings</h2>
        <span className="t-small">On this device only</span>
      </div>
      <div className="shelf-strip">
        {drafts.map((draft, i) => (
          <button
            key={draft.id}
            type="button"
            className="card"
            onClick={() => navigate(`/new/draw?draft=${draft.id}`)}
          >
            <img src={thumbs[i]} alt="" />
            <span className="title">{draft.placeName ?? 'Untitled spot'}</span>
            <span className="meta">
              Unfinished · {new Date(draft.updatedAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SketchbookGrid({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [rows, setRows] = useState<FrescoRow[]>([])
  const [thumbUrls, setThumbUrls] = useState<Record<string, string | null>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [mode, setMode] = useState<GroupMode>('place')

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

  useEffect(() => {
    listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]))
  }, [])

  const openFresco = rows.find((r) => r.id === openId)

  return (
    <div className="scroll lined">
      <div className="page sketchbook">
        <div className="sb-head">
          <h1>Sketchbook</h1>
          <p className="t-small">
            <Link className="link" to="/me">
              Your profile and sign out
            </Link>
          </p>
        </div>

        <UnderdrawingsShelf drafts={drafts} />

        {status === 'ready' && rows.length > 0 && (
          <div className="seg" role="group" aria-label="Group frescoes by">
            <button type="button" aria-pressed={mode === 'place'} onClick={() => setMode('place')}>
              Place
            </button>
            <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>
              Month
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="shelf-strip" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="sketchbook-skeleton" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <p className="notice danger" role="alert">
            <Icon name="warn" />
            <span>
              Couldn&apos;t load your Sketchbook.{' '}
              <button type="button" className="link" onClick={load}>
                Retry
              </button>
            </span>
          </p>
        )}

        {status === 'ready' && rows.length === 0 && drafts.length === 0 && (
          <section className="empty">
            <h2>Your Sketchbook is empty.</h2>
            <p>Tap New to make your first fresco.</p>
          </section>
        )}

        {status === 'ready' &&
          groupFrescoes(rows, mode).map((group) => (
            <section key={group.label} className="shelf">
              <div className="shelf-head">
                <h2>{group.label}</h2>
              </div>
              <div className="shelf-strip">
                {group.rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="card"
                    onClick={() => setOpenId(row.id)}
                  >
                    {thumbUrls[row.id] != null ? (
                      <img src={thumbUrls[row.id]!} alt="" loading="lazy" />
                    ) : (
                      <div className="thumb" />
                    )}
                    <span className="title">{row.title}</span>
                    <span className="meta">
                      {row.visibility === 'public' ? (
                        <>
                          <Icon name="globe" /> On Sinopia
                        </>
                      ) : (
                        <>
                          <Icon name="lock" /> Only me
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}

        {openFresco !== undefined && (
          <FrescoDetail fresco={openFresco} onClose={() => setOpenId(null)} onChanged={load} />
        )}
      </div>
    </div>
  )
}

export function SketchbookPage() {
  const { session, loading } = useSession()
  if (loading) return <p className="page t-small">Loading&hellip;</p>

  return (
    <AuthGate message="Sign in to see your Sketchbook.">
      {session !== null && <SketchbookGrid userId={session.user.id} />}
    </AuthGate>
  )
}
