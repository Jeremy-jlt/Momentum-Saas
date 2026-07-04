import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `relative pb-1 text-sm transition-colors ${
      isActive
        ? 'font-bold text-white after:content-[""] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-[2px] after:bg-emerald-500'
        : 'text-gray-400 hover:text-white'
    }`

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold tracking-widest text-sm">MOMENTUM</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 flex-1">
            <NavLink to="/" end className={linkClass}>
              Accueil
            </NavLink>
            <NavLink to="/engagements" className={linkClass}>
              Mes engagements
            </NavLink>
            <NavLink to="/habits" className={linkClass}>
              Habitudes
            </NavLink>
            <NavLink to="/how-it-works" className={linkClass}>
              Comment ça marche ?
            </NavLink>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/new"
              className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold text-sm rounded-md px-4 py-2 whitespace-nowrap"
            >
              + Nouvel engagement
            </Link>
            {user && (
              <div className="hidden lg:flex items-center gap-3">
                <span className="text-xs text-gray-400">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-xs border border-gray-700 text-gray-300 rounded-md px-3 py-2 hover:border-gray-500 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
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
          <span>Reprends le contrôle</span>
        </div>
      </footer>
    </div>
  )
}
