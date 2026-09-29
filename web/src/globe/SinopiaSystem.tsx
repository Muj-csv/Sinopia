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
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../auth/Avatar'
import { loadFavorites, loadFriendIds, type FavoriteInfo } from '../friends/friends'
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
import { FloatingMarks } from './FloatingMarks'

type DataStatus = 'loading' | 'ready' | 'error'

/**
 * How long the "entering a world" zoom plays before the route actually changes. Long enough to
 * read as an intentional dive into the globe, short enough that New still feels one tap away.
 */
const ENTER_ANIMATION_MS = 360

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
  /** The world mid-click, growing toward the viewer before the route actually changes. */
  const [entering, setEntering] = useState<string | null>(null)
  const enterTimer = useRef<number | null>(null)
  /**
   * Who orbits you now: only accepted Sinopia Neighbors, not every account that has ever signed
   * up. `null` means "not loaded yet" -- kept distinct from an empty set so the system doesn't
   * flash "no neighbors" for a moment before the real answer arrives.
   */
  const [friendIds, setFriendIds] = useState<Set<string> | null>(null)
  const [favorites, setFavorites] = useState<Map<string, FavoriteInfo>>(new Map())
  /** Hover only (desktop): a tap still means "enter", so touch never opens this instead. */
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverCapable] = useState(
    () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false,
  )

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
    let cancelled = false
    Promise.resolve()
      .then(() => (myId === null ? null : loadFriendIds(myId)))
      .then((ids) => {
        if (!cancelled) setFriendIds(ids)
      })
    return () => {
      cancelled = true
    }
  }, [myId])

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Clears the pending navigation if the screen goes away for some other reason mid-animation.
  useEffect(() => {
    return () => {
      if (enterTimer.current !== null) window.clearTimeout(enterTimer.current)
    }
  }, [])

  /** Your frescoes, and nobody else's, on your own globe. */
  const myPoints = useMemo(
    () => (myId === null ? [] : points.filter((p) => p.owner_id === myId)),
    [points, myId],
  )
  // Friends-only orbit: signing up no longer makes your globe visible to strangers browsing the
  // system -- only accounts that have accepted a Sinopia Neighbor request appear here at all.
  const others = useMemo(
    () =>
      friendIds === null
        ? []
        : sinopias.filter((s) => s.ownerId !== myId && friendIds.has(s.ownerId)),
    [sinopias, myId, friendIds],
  )
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
  const orbiting = useMemo(() => others.slice(0, capacity), [others, capacity])
  const sizes = sphereSizes(width)

  // The small artwork bubble above a globe: fetched for whoever is actually on screen (you, plus
  // the neighbors currently in orbit), not the whole friends list.
  const relevantOwnerIds = useMemo(() => {
    const ids = orbiting.map((s) => s.ownerId)
    if (myId !== null) ids.push(myId)
    return ids
  }, [orbiting, myId])
  const relevantOwnerKey = relevantOwnerIds.join(',')

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => loadFavorites(relevantOwnerKey === '' ? [] : relevantOwnerKey.split(',')))
      .then((loaded) => {
        if (!cancelled) setFavorites(loaded)
      })
    return () => {
      cancelled = true
    }
  }, [relevantOwnerKey])

  /**
   * A tap should feel like it did something immediately -- the clicked world grows toward the
   * viewer while the rest of the sky dims -- and only then hands off to the route change, instead
   * of the navigation cutting the animation off before a frame of it ever painted.
   */
  const enter = (ownerId: string) => {
    if (entering !== null) return
    setHoveredId(null)
    setEntering(ownerId)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    enterTimer.current = window.setTimeout(
      () => navigate(`/s/${ownerId}`),
      reduceMotion ? 0 : ENTER_ANIMATION_MS,
    )
  }

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
        : myId === null
          ? { text: 'Sign in to add Sinopia Neighbors and see their worlds here.', tone: 'info' }
          : friendIds === null
            ? { text: 'Finding your neighbors…', tone: 'plain' }
            : others.length === 0
              ? {
                  text: 'No Sinopia Neighbors yet. Add someone on the Friends tab to see their world here.',
                  tone: 'info',
                }
              : null

  // A failed fresco fetch used to replace the whole system with an empty list, which read as a
  // blank page. The worlds do not depend on that fetch -- they come from profiles -- so the
  // system still stands, and the notice says only what is actually missing.

  return (
    <div className="globe-container sinopia-system">
      {/* Slow, corner-hugging ink marks -- purely decorative and behind everything else, so they
          never sit between a tap and the world it was meant for. */}
      <FloatingMarks />

      {/* One credit for every globe in the system, rather than a control on each sphere. */}
      <p className="system-attribution">© OpenStreetMap contributors · tiles by OpenFreeMap</p>

      <div className={entering !== null ? 'system-field has-entering' : 'system-field'}>
        {myId !== null ? (
          <button
            type="button"
            className={entering === myId ? 'system-centre entering' : 'system-centre'}
            onClick={() => enter(myId)}
            onMouseEnter={hoverCapable ? () => setHoveredId(myId) : undefined}
            onMouseLeave={
              hoverCapable ? () => setHoveredId((h) => (h === myId ? null : h)) : undefined
            }
            disabled={entering !== null && entering !== myId}
            aria-label="Enter your Sinopia"
          >
            {favorites.has(myId) && (
              <span className="globe-bubble" aria-hidden="true">
                <img src={favorites.get(myId)!.thumbUrl} alt="" />
              </span>
            )}
            <GlobeSphere points={myPoints} size={sizes.centre} spin={entering !== myId} />
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
          const isEntering = entering === sinopia.ownerId
          const favorite = favorites.get(sinopia.ownerId)
          return (
            <button
              key={sinopia.ownerId}
              type="button"
              className={isEntering ? 'system-planet entering' : 'system-planet'}
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
              onClick={() => enter(sinopia.ownerId)}
              onMouseEnter={hoverCapable ? () => setHoveredId(sinopia.ownerId) : undefined}
              onMouseLeave={
                hoverCapable
                  ? () => setHoveredId((h) => (h === sinopia.ownerId ? null : h))
                  : undefined
              }
              disabled={entering !== null && !isEntering}
              aria-label={`Enter ${sinopia.name}'s Sinopia, ${sinopia.count} ${
                sinopia.count === 1 ? 'fresco' : 'frescoes'
              }`}
            >
              {favorite !== undefined && (
                <span className="globe-bubble" aria-hidden="true">
                  <img src={favorite.thumbUrl} alt="" />
                </span>
              )}
              <GlobeSphere
                points={pointsFor.get(sinopia.ownerId) ?? []}
                size={place.size}
                spin={!isEntering}
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

      {/* Hover preview (desktop only -- see hoverCapable): who a globe belongs to and, if they've
          chosen one, the fresco they're proudest of. sinopias holds an entry for every account
          rendered here, yours included, so one lookup covers the centre and the orbit alike. */}
      {hoveredId !== null &&
        (() => {
          const preview = sinopias.find((s) => s.ownerId === hoveredId)
          if (preview === undefined) return null
          const favorite = favorites.get(hoveredId)
          return (
            <div className="system-preview">
              <Avatar config={preview.avatar} size={56} />
              <div className="system-preview-body">
                <strong>{hoveredId === myId ? 'You' : preview.name}</strong>
                <span className="t-small">
                  {preview.count} {preview.count === 1 ? 'fresco' : 'frescoes'}
                </span>
              </div>
              {favorite !== undefined && (
                <img src={favorite.thumbUrl} alt="" className="system-preview-favorite" />
              )}
            </div>
          )
        })()}

      {/* The space between the worlds is the thing you draw on. */}
      <SpaceLayer />
    </div>
  )
}
