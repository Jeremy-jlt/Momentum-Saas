import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Onboarding from './Onboarding'
import BeamsBackground from './BeamsBackground'
import DailyProgressBar from './DailyProgressBar'
import WeeklyBanner from './WeeklyBanner'
import ReminderScheduler from './ReminderScheduler'
import CommandPalette from './CommandPalette'
import { useCommandPalette } from '../hooks/useCommandPalette'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette()

  useEffect(() => {
    setShowMobileMenu(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `relative pb-1 text-xs font-medium transition-colors after:absolute after:left-0 after:bottom-0 after:h-[1.5px] after:bg-[var(--accent)] after:transition-[width] after:duration-150 after:ease-out ${
      isActive
        ? 'text-[var(--accent)] after:w-full'
        : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)] after:w-0 hover:after:w-full'
    }`

  const mobileLinkClass = ({ isActive }) =>
    `block rounded-md px-3 py-3 text-sm font-medium tap-target transition-colors ${
      isActive
        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
    }`

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : ''

  const todayLabelRaw = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const todayLabel = todayLabelRaw.charAt(0).toUpperCase() + todayLabelRaw.slice(1)
  const dayCount = user?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) + 1)
    : null

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-0)] text-[var(--text-strong)]">
      {/* Fond animé plein écran, derrière tout le contenu (header et footer
          compris) — aucune délimitation visible. */}
      <BeamsBackground fixed />
      <DailyProgressBar />

      {user && <Onboarding />}

      <header className="header-glass border-b-[0.5px] border-[var(--border-faint)]">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
            <span className="font-bold text-xs tracking-widest">MOMENTUM</span>
          </Link>

          <div className="w-[0.5px] h-5 bg-[var(--border)] shrink-0" />

          {user && (
            <span className="hidden lg:inline text-[11px] text-[var(--text-subtle)] whitespace-nowrap shrink-0">
              {todayLabel}
              {dayCount != null && <> · Jour {dayCount}</>}
            </span>
          )}

          <nav className="hidden md:flex items-center gap-6 flex-1">
            {user ? (
              <>
                <NavLink to="/" end className={linkClass}>
                  Accueil
                </NavLink>
                <NavLink to="/engagements" className={linkClass}>
                  Engagements
                </NavLink>
                <NavLink to="/habits" className={linkClass}>
                  Habitudes
                </NavLink>
                <NavLink to="/projects" className={linkClass}>
                  Projets
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={linkClass}>
                  Accueil
                </NavLink>
                <NavLink to="/how-it-works" className={linkClass}>
                  Comment ça marche ?
                </NavLink>
                <NavLink to="/pricing" className={linkClass}>
                  Tarifs
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme === 'ivory' ? 'Passer en thème sombre' : 'Passer en thème clair'}
              aria-label={theme === 'ivory' ? 'Passer en thème sombre' : 'Passer en thème clair'}
              className="text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors px-2 py-1.5 whitespace-nowrap"
            >
              {theme === 'ivory' ? 'Sombre' : 'Clair'}
            </button>

            {user ? (
              <>
                <Link
                  to="/new"
                  className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-[background-color,box-shadow] duration-200 text-[var(--accent-contrast)] rounded-[5px] px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
                >
                  + Nouveau
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    aria-label="Menu du compte"
                    aria-expanded={showUserMenu}
                    className="w-7 h-7 rounded-full bg-[var(--surface-3)] border-[0.5px] border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center justify-center"
                  >
                    {initials}
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-[var(--surface-1)] border-[0.5px] border-[var(--border)] rounded-lg overflow-hidden">
                        <p className="text-[11px] text-[var(--text-faint)] px-4 pt-3 pb-2 truncate">
                          {user.email}
                        </p>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="block text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-3)] transition-colors px-4 py-2"
                        >
                          Mon profil
                        </Link>
                        <Link
                          to="/progress"
                          onClick={() => setShowUserMenu(false)}
                          className="block text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-3)] transition-colors px-4 py-2"
                        >
                          Ma progression
                        </Link>
                        <Link
                          to="/pricing"
                          onClick={() => setShowUserMenu(false)}
                          className="block text-xs text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--surface-3)] transition-colors px-4 py-2"
                        >
                          Tarifs
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left text-xs text-[var(--danger)] hover:bg-[var(--surface-3)] transition-colors px-4 py-2"
                        >
                          Se déconnecter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors rounded-[5px] px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
              >
                Se connecter
              </Link>
            )}

            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              aria-label={showMobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={showMobileMenu}
              className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 text-[var(--text-muted)] shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                {showMobileMenu ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 6h14M3 10h14M3 14h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {showMobileMenu && (
          <nav className="md:hidden border-t-[0.5px] border-[var(--border-faint)] px-4 py-3 flex flex-col gap-1 animate-[mobile-menu-slide_200ms_ease-out]">
            {user ? (
              <>
                <NavLink to="/" end className={mobileLinkClass}>
                  Accueil
                </NavLink>
                <NavLink to="/engagements" className={mobileLinkClass}>
                  Engagements
                </NavLink>
                <NavLink to="/habits" className={mobileLinkClass}>
                  Habitudes
                </NavLink>
                <NavLink to="/projects" className={mobileLinkClass}>
                  Projets
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={mobileLinkClass}>
                  Accueil
                </NavLink>
                <NavLink to="/how-it-works" className={mobileLinkClass}>
                  Comment ça marche ?
                </NavLink>
                <NavLink to="/pricing" className={mobileLinkClass}>
                  Tarifs
                </NavLink>
              </>
            )}
          </nav>
        )}
      </header>

      {user && <WeeklyBanner />}
      {user && <ReminderScheduler />}

      <main className="relative z-10 flex-1">
        <div key={location.pathname} className="animate-[page-fade-in_220ms_ease-out]">
          <Outlet />
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
              <span className="font-bold text-xs tracking-widest text-[var(--text-strong)]">MOMENTUM</span>
            </Link>

            <div className="flex items-center gap-6 text-xs text-[var(--text-faint)]">
              <Link to="/pricing" className="hover:text-[var(--text-muted)] transition-colors">
                Tarifs
              </Link>
              <Link to="/how-it-works" className="hover:text-[var(--text-muted)] transition-colors">
                Comment ça marche
              </Link>
              <a href="mailto:contact@momentum-app.fr" className="hover:text-[var(--text-muted)] transition-colors">
                Contact
              </a>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Momentum sur X"
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
              >
                𝕏
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Momentum sur Instagram"
                className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
              >
                ◎
              </a>
            </div>
          </div>

          <p className="text-[11px] text-[var(--text-faint)] text-center">
            © 2026 Momentum · Fait pour ceux qui refusent de perdre leur temps · Fait avec 🖤
          </p>
        </div>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
