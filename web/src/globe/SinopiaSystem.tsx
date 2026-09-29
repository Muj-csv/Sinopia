/**
 * The system: every account's Sinopia as its own globe, yours at the centre and the others
 * orbiting it.
 *
 * This is what you land on. Nothing here is navigable -- you are outside the worlds, looking at
 * them. Choosing one takes you into it, and that is where panning, zooming and opening frescoes
 * happen (GlobePage, at /s/:userId).
 *
 * How many orbit at once is capped by screen width, and the cap is a hard technical limit rather
 * than taste: every globe is a MapLibre map holding a WebGL context, and a browser starts
 * discarding the oldest once a page has too many.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './globe.css'
import { GlobeFallbackList } from './GlobeFallbackList'
import { GlobeSphere } from './GlobeSphere'
import type { GlobePoint } from './geoJson'
import { loadGlobePoints } from './loadGlobePoints'
import { loadSinopias } from './sinopiaDirectory'
import type { Sinopia } from './sinopias'
import { SpaceLayer } from './SpaceLayer'

type DataStatus = 'loading' | 'ready' | 'error'

/** Orbiting globes on screen at once. See the WebGL note above: this is a ceiling, not a taste. */
function orbitCapacity(width: number): number {
  if (width < 640) return 2
  if (width < 900) return 4
  return 6
}

function sphereSizes(width: number): { centre: number; orbiting: number } {
  if (width < 640) return { centre: 170, orbiting: 66 }
  if (width < 900) return { centre: 240, orbiting: 84 }
  return { centre: 320, orbiting: 104 }
}

/**
 * One orbit per world, laid out like a planetary system: each sits further out than the last and
 * takes longer to come round, so the ring never locks into a turning wheel.
 */
function orbitOf(index: number, total: number) {
  const spread = total === 1 ? 0 : index / (total - 1)
  return {
    // Percentages of the smaller viewport edge, so the system scales with the window.
    radius: 34 + spread * 14,
    duration: 90 + index * 26,
    // Spaced around the ring so two worlds never start on top of each other.
    delay: -(index * (90 / Math.max(total, 1))),
  }
}

export function SinopiaSystem() {
  const navigate = useNavigate()
  const { session } = useSession()
  const myId = session?.user.id ?? null

  const [points, setPoints] = useState<GlobePoint[]>([])
  const [sinopias, setSinopias] = useState<Sinopia[]>([])
  const [status, setStatus] = useState<DataStatus>('loading')
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    let cancelled = false
    loadGlobePoints().then(async ({ points: loaded, error }) => {
      if (cancelled) return
      setPoints(loaded)
      setStatus(error ? 'error' : 'ready')
      const worlds = await loadSinopias(loaded)
      if (!cancelled) setSinopias(worlds)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /** Your frescoes, and nobody else's, on your own globe. */
  const myPoints = useMemo(
    () => (myId === null ? [] : points.filter((p) => p.owner_id === myId)),
    [points, myId],
  )
  const others = useMemo(() => sinopias.filter((s) => s.ownerId !== myId), [sinopias, myId])
  const pointsFor = useMemo(() => {
    const byOwner = new Map<string, GlobePoint[]>()
    for (const point of points) {
      const list = byOwner.get(point.owner_id)
      if (list === undefined) byOwner.set(point.owner_id, [point])
      else list.push(point)
    }
    return byOwner
  }, [points])

  const capacity = orbitCapacity(width)
  const orbiting = others.slice(0, capacity)
  const sizes = sphereSizes(width)
  const enter = (ownerId: string) => navigate(`/s/${ownerId}`)

  if (status === 'error') {
    return (
      <div className="globe-container">
        <GlobeFallbackList points={points} dataFailed />
      </div>
    )
  }

  return (
    <div className="globe-container sinopia-system">
      {/* One credit for every globe in the system, rather than a control on each sphere. */}
      <p className="system-attribution">© OpenStreetMap contributors · tiles by OpenFreeMap</p>

      <div className="system-field">
        {myId !== null ? (
          <button
            type="button"
            className="system-centre"
            onClick={() => enter(myId)}
            aria-label="Enter your Sinopia"
          >
            <GlobeSphere points={myPoints} size={sizes.centre} spin />
            <span className="system-label system-label-mine">Your Sinopia</span>
          </button>
        ) : (
          <div className="system-centre system-centre-empty">
            <p>
              Sign in to start a Sinopia of your own.
              {others.length > 0 && ' Until then, visit someone else’s.'}
            </p>
          </div>
        )}

        {orbiting.map((sinopia, i) => {
          const orbit = orbitOf(i, orbiting.length)
          return (
            <div
              key={sinopia.ownerId}
              className="system-orbit"
              style={{
                // Custom properties drive the keyframes, so one animation serves every orbit.
                ['--orbit-radius' as string]: `${orbit.radius}%`,
                ['--orbit-duration' as string]: `${orbit.duration}s`,
                ['--orbit-delay' as string]: `${orbit.delay}s`,
              }}
            >
              {/* Counter-rotated so the world itself stays upright while its orbit carries it. */}
              <div className="system-orbit-body">
                <button
                  type="button"
                  className="system-planet"
                  onClick={() => enter(sinopia.ownerId)}
                  aria-label={`Enter ${sinopia.name}'s Sinopia, ${sinopia.count} ${
                    sinopia.count === 1 ? 'fresco' : 'frescoes'
                  }`}
                >
                  <GlobeSphere
                    points={pointsFor.get(sinopia.ownerId) ?? []}
                    size={sizes.orbiting}
                  />
                  <span className="system-label">{sinopia.name}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {status === 'loading' && <p className="globe-status">Finding the worlds&hellip;</p>}
      {status === 'ready' && sinopias.length === 0 && (
        <p className="globe-status">
          <Icon name="info" />
          Nobody has published a fresco yet.
        </p>
      )}
      {others.length > orbiting.length && (
        <p className="system-more">{others.length - orbiting.length} more worlds further out</p>
      )}

      {/* The space between the worlds is the thing you draw on. */}
      <SpaceLayer />
    </div>
  )
}
