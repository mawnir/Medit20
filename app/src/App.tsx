import { useEffect, useRef, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { Library } from './components/Library'
import { PlayerBar } from './components/PlayerBar'
import { SeriesView } from './components/SeriesView'
import { ZenSanctuary } from './components/ZenSanctuary'
import { ZenIcon } from './components/Icon'
import { getSeries, series } from './lib/manifest'
import { PlayerProvider } from './player/PlayerProvider'
import { THEME_ORDER, setThemePref, useTheme, type ThemePref } from './lib/theme'

function LibraryEmpty() {
  return (
    <section className="empty" data-ui="true">
      <h1>No sessions found</h1>
      <p>
        Put transcoded audio in <code>web-audio/</code> next to this project, then run{' '}
        <code>npm run manifest</code>.
      </p>
    </section>
  )
}

function Home({ onOpenSanctuary }: { onOpenSanctuary: () => void }) {
  return series.length > 0 ? (
    <Library series={series} onOpenSanctuary={onOpenSanctuary} />
  ) : (
    <LibraryEmpty />
  )
}

function SeriesRoute({ onOpenSanctuary }: { onOpenSanctuary: () => void }) {
  const { seriesId } = useParams()
  const found = seriesId ? getSeries(seriesId) : undefined
  if (!found) return <Navigate to="/" replace />
  return <SeriesView series={found} onOpenSanctuary={onOpenSanctuary} />
}

const THEME_LABELS: Record<ThemePref, { next: string; aria: string }> = {
  system: { next: 'Light', aria: 'Theme follows device' },
  light: { next: 'Dark', aria: 'Light theme' },
  dark: { next: 'System', aria: 'Dark theme' },
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 20.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const THEME_ICONS: Record<ThemePref, typeof SunIcon> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon,
}

function ThemeToggle() {
  const pref = useTheme()
  const Icon = THEME_ICONS[pref]
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={() =>
        setThemePref(THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length])
      }
      title={THEME_LABELS[pref].aria}
      aria-label={`Current theme: ${pref}. Switch to ${THEME_LABELS[pref].next.toLowerCase()}`}
    >
      <Icon />
    </button>
  )
}

function Header({ onOpenSanctuary }: { onOpenSanctuary: () => void }) {
  return (
    <header className="site-head">
      <div className="brand-group">
        <Link to="/" className="brand-link" aria-label="Meditaiton20 Home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 28 28" width="22" height="22">
              <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="48 8" />
              <circle cx="14" cy="14" r="3.6" fill="currentColor" />
            </svg>
          </span>
          <span className="wordmark">Meditaiton20</span>
        </Link>
      </div>

      <nav className="site-nav" aria-label="Practice pathways">
        {series.map((entry) => (
          <NavLink
            key={entry.id}
            to={`/series/${entry.id}`}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            {entry.title}
          </NavLink>
        ))}
      </nav>

      <div className="header-tools">
        <button
          type="button"
          className="header-zen-btn"
          onClick={onOpenSanctuary}
          title="Open Zen Sanctuary (Key: Z)"
          aria-label="Open Zen Sanctuary"
        >
          <ZenIcon />
          <span>Sanctuary</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

function RouteFrame() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement | null>(null)
  const previousPath = useRef(pathname)
  const [sanctuaryOpen, setSanctuaryOpen] = useState(false)

  useEffect(() => {
    const found = getSeries(pathname.replace(/^\/series\//, '').split('/')[0] ?? '')
    document.title = found ? `${found.title} · Meditaiton20` : 'Meditaiton20'

    if (previousPath.current === pathname) return
    previousPath.current = pathname

    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  // Global keydown handler for 'Z' to toggle Zen Sanctuary
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'z' || e.key === 'Z') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          setSanctuaryOpen((prev) => !prev)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <div className="wrap">
          <Header onOpenSanctuary={() => setSanctuaryOpen(true)} />
          <main id="main" ref={mainRef} tabIndex={-1}>
            <Routes>
              <Route path="/" element={<Home onOpenSanctuary={() => setSanctuaryOpen(true)} />} />
              <Route
                path="/series/:seriesId"
                element={<SeriesRoute onOpenSanctuary={() => setSanctuaryOpen(true)} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <PlayerBar onOpenSanctuary={() => setSanctuaryOpen(true)} />

      {sanctuaryOpen && <ZenSanctuary onClose={() => setSanctuaryOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <Router>
        <RouteFrame />
      </Router>
    </PlayerProvider>
  )
}
