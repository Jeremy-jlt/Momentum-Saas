import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Onboarding from './Onboarding'
import BeamsBackground from './BeamsBackground'

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

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

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : ''

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-0)] text-[var(--text-strong)]">
      {/* Fond animé plein écran, derrière tout le contenu (header et footer
          compris) — aucune délimitation visible. */}
      <BeamsBackground fixed intensity="subtle" />

      {user && <Onboarding />}

      <header className="relative z-10 border-b-[0.5px] border-[var(--border-faint)]">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
            <span className="font-bold text-xs tracking-widest">MOMENTUM</span>
          </Link>

          <div className="w-[0.5px] h-5 bg-[var(--border)] shrink-0" />

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
              title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              className="text-[11px] font-medium text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors px-2 py-1.5 whitespace-nowrap"
            >
              {theme === 'dark' ? 'Clair' : 'Sombre'}
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
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-[var(--text-faint)]">
          <span>© 2026 Momentum</span>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-[var(--text-muted)] transition-colors">
              Tarifs
            </Link>
            <span>Reprends le contrôle</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
