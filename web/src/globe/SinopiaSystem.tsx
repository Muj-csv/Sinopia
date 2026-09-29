/**
 * The system: every account's Sinopia as its own globe, yours in the middle and the others fixed
 * around it in the sky.
 *
 * The worlds do not travel. Each holds its own spot and turns on its axis there, so the sky is a
 * place you can learn rather than a carousel you have to wait for -- a world you saw to the left
 * last time is still to the left now. Its spot, size and spin rate all come from the account's
 * own id (see `systemLayout.ts`), so signing up gives you a permanent address up there.
 *
 * This is what you land on. Nothing here is navigable -- you are outside the worlds, looking at
 * them. Choosing one takes you into it, and that is where panning, zooming and opening frescoes
 * happen (GlobePage, at /s/:userId).
 *
 * How many appear at once is capped by screen width, and the cap is a hard technical limit rather
 * than taste: every globe is a MapLibre map holding a WebGL context, and a browser starts
 * discarding the oldest once a page has too many.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../lib/useSession'
import { Icon } from '../ui/Icon'
import './globe.css'
import { GlobeSphere } from './GlobeSphere'
import type { GlobePoint } from './geoJson'
import { loadGlobePoints } from './loadGlobePoints'
import { loadSinopias } from './sinopiaDirectory'
import type { Sinopia } from './sinopias'
import { placeWorld } from './systemLayout'
import { SpaceLayer } from './SpaceLayer'

type DataStatus = 'loading' | 'ready' | 'error'

/** Globes on screen at once. See the WebGL note above: this is a ceiling, not a taste. */
function orbitCapacity(width: number): number {
  if (width < 640) return 2
  if (width < 900) return 4
  return 6
}

function sphereSizes(width: number): { centre: number; orbiting: number } {
  if (width < 640) return { centre: 190, orbiting: 62 }
  if (width < 900) return { centre: 280, orbiting: 82 }
  return { centre: 380, orbiting: 104 }
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

  /**
   * The single line under the system, in priority order. A system of one is worth saying out
   * loud: without it, one lonely globe looks like the others failed to load.
   */
  const note: { text: string; tone: 'plain' | 'info' | 'warn' } | null =
    status === 'loading'
      ? { text: 'Finding the worlds…', tone: 'plain' }
      : status === 'error'
        ? {
            text: 'The frescoes are waking up. The worlds are here; what is drawn on them isn’t.',
            tone: 'warn',
          }
        : sinopias.length === 0
          ? {
              text: 'No Sinopias yet. Every account that signs up gets a world here.',
              tone: 'info',
            }
          : others.length === 0
            ? {
                text: 'Yours is the only Sinopia so far. Others appear here as accounts join.',
                tone: 'info',
              }
            : null

  // A failed fresco fetch used to replace the whole system with an empty list, which read as a
  // blank page. The worlds do not depend on that fetch -- they come from profiles -- so the
  // system still stands, and the notice says only what is actually missing.

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
          // Spot, size and spin all come from the account's id, so this world is always here.
          const place = placeWorld(sinopia.ownerId, i, orbiting.length, sizes.orbiting)
          return (
            <button
              key={sinopia.ownerId}
              type="button"
              className="system-planet"
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
              onClick={() => enter(sinopia.ownerId)}
              aria-label={`Enter ${sinopia.name}'s Sinopia, ${sinopia.count} ${
                sinopia.count === 1 ? 'fresco' : 'frescoes'
              }`}
            >
              <GlobeSphere
                points={pointsFor.get(sinopia.ownerId) ?? []}
                size={place.size}
                spin
                spinSpeed={place.spin}
              />
              <span className="system-label">{sinopia.name}</span>
            </button>
          )
        })}
      </div>

      {/* One line at a time. These all dock to the same spot, so rendering two at once stacked
          them on top of each other and neither could be read. */}
      {note !== null && (
        <p
          className={note.tone === 'warn' ? 'globe-status notice' : 'globe-status'}
          role={note.tone === 'warn' ? 'alert' : 'status'}
        >
          {note.tone !== 'plain' && <Icon name={note.tone === 'warn' ? 'warn' : 'info'} />}
          {note.text}
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
