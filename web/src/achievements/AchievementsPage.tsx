/**
 * '/achievements' -- achieved/not-achieved, one artist at a time. Reached from Profile (not the
 * navbar: Update 1.2 §3 "Do not overload the navbar" already settled that for Settings/About/Sign
 * out, and this is the same kind of occasional destination). No count is shown next to anyone
 * else's -- there is no "anyone else's" here at all (CLAUDE.md: no rankings).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import { ACHIEVEMENTS, computeUnlockedIds } from './achievements'
import { fetchAchievementStats } from './achievementStats'
import { hasMilestone } from './localMilestones'
import { writeSeen } from './seenAchievements'
import './achievements.css'

function AchievementsList({ userId }: { userId: string }) {
  const [unlocked, setUnlocked] = useState<Set<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAchievementStats(userId).then((stats) => {
      if (cancelled) return
      const ids = computeUnlockedIds({
        stats,
        milestones: {
          eyedropper: hasMilestone('eyedropper'),
          'pinned-reference': hasMilestone('pinned-reference'),
          'doodle-guess': hasMilestone('doodle-guess'),
        },
      })
      setUnlocked(ids)
      // Visiting this page shows every unlocked achievement already, so there is nothing left to
      // toast for them elsewhere later.
      writeSeen(userId, ids)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (unlocked === null) {
    return <p className="t-small">Counting what you&apos;ve made&hellip;</p>
  }

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length

  return (
    <>
      <p className="t-small">
        {unlockedCount} of {ACHIEVEMENTS.length}
      </p>
      <ul className="achievement-list">
        {ACHIEVEMENTS.map((a) => {
          const done = unlocked.has(a.id)
          return (
            <li key={a.id} className={done ? 'achievement done' : 'achievement'}>
              <Icon name={done ? 'trophy' : 'lock'} />
              <div>
                <p className="achievement-name">{a.name}</p>
                <p className="t-small">{a.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function AchievementsPage() {
  const { session, loading } = useSession()

  return (
    <div className="scroll lined">
      <section className="page">
        <h1>Achievements</h1>
        {loading ? (
          <p className="t-small">Loading&hellip;</p>
        ) : session === null ? (
          <p>
            <Link className="link" to="/me">
              Sign in
            </Link>{' '}
            to see which ones you&apos;ve reached.
          </p>
        ) : (
          <AchievementsList userId={session.user.id} />
        )}
      </section>
    </div>
  )
}
