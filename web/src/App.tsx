import { Suspense, lazy } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'

// Lazy-loaded per route (ARCHITECTURE.md §7: keep the initial bundle small;
// Konva and MapLibre are the two heaviest dependencies).
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

const NAV_ITEMS = [
  { to: '/', label: 'Globe', end: true },
  { to: '/new', label: 'New' },
  { to: '/sketchbook', label: 'Sketchbook' },
  { to: '/me', label: 'Profile' },
]

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Sinopia</h1>
      </header>

      <main className="app-content">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<GlobePage />} />
            <Route
              path="/new"
              element={
                <AuthGate message="Sign in to start a new sinopia.">
                  <CaptureSheet />
                </AuthGate>
              }
            />
            <Route path="/new/pin" element={<PinCheck />} />
            <Route path="/new/draw" element={<DrawScreen />} />
            <Route path="/new/finish" element={<FinishForm />} />
            <Route path="/sketchbook" element={<SketchbookPage />} />
            <Route path="/me" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="app-nav" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default App
