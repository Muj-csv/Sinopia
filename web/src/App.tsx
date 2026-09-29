import { Suspense, lazy } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'
import { SpaceDrawingProvider } from './globe/SpaceDrawingProvider'
import { Icon, IconSprite } from './ui/Icon'

// Lazy-loaded per route (ARCHITECTURE.md §7: keep the initial bundle small;
// Konva and MapLibre are the two heaviest dependencies).
const SinopiaSystem = lazy(() =>
  import('./globe/SinopiaSystem').then((m) => ({ default: m.SinopiaSystem })),
)
const GlobePage = lazy(() => import('./globe/GlobePage').then((m) => ({ default: m.GlobePage })))
const CaptureSheet = lazy(() =>
  import('./capture/CaptureSheet').then((m) => ({ default: m.CaptureSheet })),
)
const PinCheck = lazy(() => import('./capture/PinCheck').then((m) => ({ default: m.PinCheck })))
const DrawScreen = lazy(() => import('./draw/DrawScreen').then((m) => ({ default: m.DrawScreen })))
const FinishForm = lazy(() =>
  import('./frescoes/FinishForm').then((m) => ({ default: m.FinishForm })),
)
const SketchbookPage = lazy(() =>
  import('./sketchbook/SketchbookPage').then((m) => ({ default: m.SketchbookPage })),
)
const ProfilePage = lazy(() =>
  import('./auth/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const AboutPage = lazy(() => import('./auth/AboutPage').then((m) => ({ default: m.AboutPage })))
const FrescoViewer = lazy(() =>
  import('./viewer/FrescoViewer').then((m) => ({ default: m.FrescoViewer })),
)

/**
 * Capture, Pin check, Canvas and Finish are full-screen and carry their own exit, so the nav is
 * hidden there (UX_MAP: "the bar is hidden in the flow screens"). Everything else keeps it.
 */
const FLOW_ROUTES = ['/new', '/new/pin', '/new/draw', '/new/finish']

function AppNav() {
  const { pathname } = useLocation()
  if (FLOW_ROUTES.includes(pathname)) return null

  return (
    <nav className="nav" aria-label="Primary">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        {/* The icon still draws a globe, because the thing on screen is still the Earth. The
            word is Sinopia: the world is yours, and the map is how you look at it. */}
        <Icon name="globe" />
        <span>Sinopia</span>
      </NavLink>
      {/* New is the centre item and the only bordered one. There is no floating action button:
          the bar already puts New in the thumb zone, and yellow is reserved per screen. */}
      <NavLink to="/new" className={({ isActive }) => (isActive ? 'new active' : 'new')}>
        <Icon name="plus" />
        <span>New</span>
      </NavLink>
      <NavLink to="/sketchbook" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <Icon name="book" />
        <span>Sketchbook</span>
      </NavLink>
      {/* Four items is the ceiling for a thumb-reachable bar. Settings, About and Sign out live
          inside Profile rather than lengthening this (Update 1.2 §3: "Do not overload the navbar"). */}
      <NavLink to="/me" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        <Icon name="person" />
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}

function App() {
  return (
    // The space marks are held above the router: they belong to this visit, not to one screen, so
    // they survive opening a fresco and coming back, and go when the page does (Update 1.2 §15).
    <SpaceDrawingProvider>
      <div className="app">
        <IconSprite />

        <main className="screen">
          <Suspense fallback={null}>
            <Routes>
              {/* The system of worlds. You look at globes here; you navigate one at /s/:userId. */}
              <Route path="/" element={<SinopiaSystem />} />
              <Route
                path="/new"
                element={
                  <AuthGate message="Sign in to start a new underdrawing.">
                    <CaptureSheet />
                  </AuthGate>
                }
              />
              <Route path="/new/pin" element={<PinCheck />} />
              <Route path="/new/draw" element={<DrawScreen />} />
              <Route path="/new/finish" element={<FinishForm />} />
              <Route path="/sketchbook" element={<SketchbookPage />} />
              <Route path="/me" element={<ProfilePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/f/:id" element={<FrescoViewer />} />
              {/* Someone else's Sinopia: the same Earth, showing their frescoes instead of yours. */}
              <Route path="/s/:userId" element={<GlobePage />} />
              <Route
                path="*"
                element={
                  <div className="scroll">
                    <section className="page empty">
                      <h2>Nothing here</h2>
                      <p>That page doesn&apos;t exist.</p>
                      <Link className="btn-o" to="/">
                        Back to your Sinopia
                      </Link>
                    </section>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>

        <AppNav />
      </div>
    </SpaceDrawingProvider>
  )
}

export default App
