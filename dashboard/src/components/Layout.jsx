import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Onboarding from './Onboarding'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `relative pb-1 text-xs font-medium transition-colors after:absolute after:left-0 after:bottom-0 after:h-[1.5px] after:bg-[#10b981] after:transition-[width] after:duration-150 after:ease-out ${
      isActive
        ? 'text-[#10b981] after:w-full'
        : 'text-[#4b5563] hover:text-gray-300 after:w-0 hover:after:w-full'
    }`

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : ''

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      {user && <Onboarding />}

      <header className="bg-[#0a0a0a] border-b-[0.5px] border-[#1f1f1f]">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-[5px] h-[5px] rounded-full bg-[#10b981]" />
            <span className="font-bold text-xs tracking-widest">MOMENTUM</span>
          </Link>

          <div className="w-[0.5px] h-5 bg-[#2a2a2a] shrink-0" />

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
            {user ? (
              <>
                <Link
                  to="/new"
                  className="bg-[#10b981] hover:bg-emerald-600 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-[background-color,box-shadow] duration-200 text-[#052e1f] rounded-[5px] px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
                >
                  + Nouveau
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="w-7 h-7 rounded-full bg-[#1a1a1a] border-[0.5px] border-[#2a2a2a] text-[11px] text-[#9ca3af] flex items-center justify-center"
                  >
                    {initials}
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-[#111111] border-[0.5px] border-[#2a2a2a] rounded-lg overflow-hidden">
                        <p className="text-[11px] text-gray-500 px-4 pt-3 pb-2 truncate">
                          {user.email}
                        </p>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="block text-xs text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] transition-colors px-4 py-2"
                        >
                          Mon profil
                        </Link>
                        <Link
                          to="/pricing"
                          onClick={() => setShowUserMenu(false)}
                          className="block text-xs text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] transition-colors px-4 py-2"
                        >
                          Tarifs
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left text-xs text-[#ef4444] hover:bg-[#1a1a1a] transition-colors px-4 py-2"
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
                className="border border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10 transition-colors rounded-[5px] px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-500">
          <span>© 2026 Momentum</span>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-gray-300 transition-colors">
              Tarifs
            </Link>
            <span>Reprends le contrôle</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
