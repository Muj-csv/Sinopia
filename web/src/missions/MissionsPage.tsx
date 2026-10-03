/**
 * '/missions': active missions, with an Archive toggle for ones that have ended (SM-FR-12). Viewable
 * signed out -- Start routes through '/new', which already gates on sign-in -- so Missions works the
 * same "browse first" way the globe does.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import './missions.css'
import { fetchActiveMissions, fetchArchivedMissions, type Mission } from './missions'
import { formatScope, formatTimeRemaining } from './missionDisplay'

type Status = 'loading' | 'ready' | 'error'
type Tab = 'active' | 'archive'

function MissionCard({ mission }: { mission: Mission }) {
  const time = formatTimeRemaining(mission)
  return (
    <Link to={`/missions/${mission.id}`} className="card mission-card">
      <h3 className="title">{mission.title}</h3>
      <p className="mission-card-prompt">{mission.prompt}</p>
      <p className="meta mission-card-meta">
        <Icon name="target" />
        {formatScope(mission)}
        {time !== null && <> · {time}</>}
      </p>
    </Link>
  )
}

export function MissionsPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [status, setStatus] = useState<Status>('loading')
  const [missions, setMissions] = useState<Mission[]>([])

  useEffect(() => {
    let cancelled = false
    // Deferred a tick so the effect body itself doesn't call setState synchronously (same reasoning
    // as FriendsPage.tsx's load()).
    void Promise.resolve().then(() => {
      if (cancelled) return
      setStatus('loading')
      const load = tab === 'active' ? fetchActiveMissions : fetchArchivedMissions
      load()
        .then((rows) => {
          if (!cancelled) {
            setMissions(rows)
            setStatus('ready')
          }
        })
        .catch(() => {
          if (!cancelled) setStatus('error')
        })
    })
    return () => {
      cancelled = true
    }
  }, [tab])

  return (
    <div className="scroll lined">
      <section className="page">
        <h1>Missions</h1>
        <p className="t-small">
          Creative prompts tied to a place or a radius -- a reason to go look at something, not a
          leaderboard.
        </p>

        <div className="seg" role="group" aria-label="Mission status">
          <button type="button" aria-pressed={tab === 'active'} onClick={() => setTab('active')}>
            Active
          </button>
          <button type="button" aria-pressed={tab === 'archive'} onClick={() => setTab('archive')}>
            Archive
          </button>
        </div>

        {status === 'loading' && <p className="t-small">Loading&hellip;</p>}
        {status === 'error' && (
          <p className="notice danger" role="alert">
            <Icon name="warn" />
            <span>Couldn&apos;t load missions. Try again in a moment.</span>
          </p>
        )}
        {status === 'ready' && missions.length === 0 && (
          <p className="t-small">
            {tab === 'active' ? 'No active missions right now.' : 'No archived missions yet.'}
          </p>
        )}
        {status === 'ready' && missions.length > 0 && (
          <div className="mission-list">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
