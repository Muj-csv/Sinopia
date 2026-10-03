/**
 * '/missions/:id' (SM-FR-03): the full prompt, scope/time, the public submission gallery, and
 * Start Mission. Starting never creates a submission by itself (SM-FR-04) -- it hands off to the
 * normal capture/draw flow at '/new?mission=<id>', which is what actually calls
 * submit_mission_fresco() once a fresco is saved (see FinishForm.tsx).
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { frescoImageUrl } from '../sketchbook/frescoImageUrl'
import { useSession } from '../lib/useSession'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import './missions.css'
import {
  fetchMission,
  fetchMissionStats,
  fetchMissionSubmissions,
  hasSubmittedToMission,
  type Mission,
  type MissionStats,
  type MissionSubmissionRow,
} from './missions'
import { formatScope, formatTimeRemaining, isMissionOpenNow } from './missionDisplay'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

function SubmissionThumb({ row }: { row: MissionSubmissionRow }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    // Public gallery rows are always public frescoes (RLS already filters out anything else), so
    // the public URL works directly -- no signed-URL round trip needed here.
    frescoImageUrl('public', row.thumbPath).then((u) => {
      if (!cancelled) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [row.thumbPath])

  return (
    <Link to={`/f/${row.frescoId}`} className="card mission-submission">
      {url !== null && <img src={url} alt={row.title} loading="lazy" />}
      <span className="meta">{row.title}</span>
    </Link>
  )
}

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useSession()
  const [status, setStatus] = useState<Status>('loading')
  const [mission, setMission] = useState<Mission | null>(null)
  const [stats, setStats] = useState<MissionStats>({ participantCount: 0, frescoCount: 0 })
  const [submissions, setSubmissions] = useState<MissionSubmissionRow[]>([])
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  useEffect(() => {
    if (id === undefined) return
    let cancelled = false
    fetchMission(id)
      .then(async (m) => {
        if (cancelled) return
        if (m === null) {
          setStatus('not-found')
          return
        }
        setMission(m)
        const [missionStats, rows] = await Promise.all([
          fetchMissionStats(id),
          fetchMissionSubmissions(id),
        ])
        if (cancelled) return
        setStats(missionStats)
        setSubmissions(rows)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (id === undefined || session === null) return
    let cancelled = false
    hasSubmittedToMission(id, session.user.id).then((v) => {
      if (!cancelled) setAlreadySubmitted(v)
    })
    return () => {
      cancelled = true
    }
  }, [id, session])

  if (status === 'loading') {
    return (
      <>
        <FlowBar title="Mission" exit="back" />
        <p className="page t-small">Loading&hellip;</p>
      </>
    )
  }
  if (status === 'not-found' || status === 'error' || mission === null) {
    return (
      <>
        <FlowBar title="Mission" exit="back" />
        <div className="scroll lined">
          <section className="page empty">
            <h2>This mission isn&apos;t available.</h2>
            <Link className="btn-o" to="/missions">
              Back to Missions
            </Link>
          </section>
        </div>
      </>
    )
  }

  const open = isMissionOpenNow(mission)
  const atLimit =
    alreadySubmitted && mission.maxSubmissionsPerUser !== null && mission.maxSubmissionsPerUser <= 1
  const time = formatTimeRemaining(mission)

  return (
    <>
      <FlowBar title={mission.title} exit="back" />
      <div className="scroll lined">
        <div className="page mission-detail">
          <p className="meta mission-card-meta">
            <Icon name="target" />
            {formatScope(mission)}
            {time !== null && <> · {time}</>}
          </p>

          <p className="mission-prompt">{mission.prompt}</p>
          {mission.description !== null && <p>{mission.description}</p>}

          <p className="t-small">
            {stats.participantCount} {stats.participantCount === 1 ? 'artist has' : 'artists have'}{' '}
            taken part · {stats.frescoCount} {stats.frescoCount === 1 ? 'fresco' : 'frescoes'}
          </p>

          {!open && (
            <p className="notice" role="status">
              <Icon name="info" />
              <span>
                {mission.status === 'closed' || mission.status === 'archived'
                  ? 'This mission has ended, but you can still see what people made.'
                  : "This mission hasn't started yet."}
              </span>
            </p>
          )}

          <button
            type="button"
            className="btn-y btn-wide"
            disabled={!open || atLimit}
            onClick={() => navigate(`/new?mission=${mission.id}`)}
          >
            {atLimit ? "You've already taken part" : 'Start Mission'}
          </button>

          {submissions.length > 0 && (
            <section className="mission-gallery">
              <h2>From this mission</h2>
              <div className="mission-gallery-grid">
                {submissions.map((row) => (
                  <SubmissionThumb key={row.frescoId} row={row} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
