import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export default function Home() {
  const { user } = useAuth()
  const [ongoingCount, setOngoingCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setOngoingCount(0)
      return
    }

    let cancelled = false

    supabase
      .from('engagements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('statut', 'en_cours')
      .then(({ count }) => {
        if (!cancelled) setOngoingCount(count ?? 0)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  // Le fond animé est global (BeamsBackground fixe dans Layout) — les deux
  // vues n'ont plus qu'à poser leur contenu par-dessus.
  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-6rem)] flex items-center">
        <div className="w-full max-w-3xl mx-auto px-6 py-24 text-center">
          <p className="anim-fade-up kicker mb-4" style={{ color: 'var(--accent)' }}>Reprends le contrôle</p>
          <h1
            className="anim-fade-up text-6xl md:text-7xl font-extrabold tracking-tight mb-4 text-[var(--text-strong)]"
            style={{ '--d': '80ms' }}
          >
            Momentum
          </h1>
          <p className="anim-fade-up text-lg text-[var(--text-muted)] mb-6 text-balance" style={{ '--d': '120ms' }}>
            Chaque jour compte. Chaque distraction coûte.
          </p>
          <p
            className="anim-fade-up text-[var(--text-faint)] max-w-xl mx-auto mb-10 text-balance"
            style={{ '--d': '240ms' }}
          >
            Bloque les sites qui te distraient pendant tes sessions de travail sur
            ordinateur. Crée un engagement avec une mise symbolique, tiens ta
            promesse, et reprends le contrôle de tes heures de concentration.
          </p>

          <div
            className="anim-fade-up flex items-center justify-center gap-4"
            style={{ '--d': '360ms' }}
          >
            <Link
              to="/login"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-[background-color,transform] text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
            >
              Créer un engagement
            </Link>
            <Link
              to="/how-it-works"
              className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-[border-color,transform] rounded-md px-6 py-3 text-sm"
            >
              Comment ça marche ?
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex items-center">
      <div className="w-full max-w-3xl mx-auto px-6 py-24 text-center">
      <p className="anim-fade-up kicker mb-4" style={{ color: 'var(--accent)' }}>Reprends le contrôle</p>
      <h1
        className="anim-fade-up text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-[var(--text-strong)]"
        style={{ '--d': '80ms' }}
      >
        Momentum
      </h1>
      <p className="anim-fade-up text-lg text-[var(--text-muted)] mb-6 text-balance" style={{ '--d': '100ms' }}>
        Chaque jour compte. Chaque distraction coûte.
      </p>
      <p
        className="anim-fade-up text-[var(--text-faint)] max-w-xl mx-auto mb-10 text-balance"
        style={{ '--d': '200ms' }}
      >
        Bloque les sites qui te distraient pendant tes sessions de travail sur
        ordinateur. Crée un engagement avec une mise symbolique, tiens ta
        promesse, et reprends le contrôle de tes heures de concentration.
      </p>

      <div className="anim-fade-up flex items-center justify-center gap-4 mb-10" style={{ '--d': '300ms' }}>
        <Link
          to="/new"
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-[background-color,transform] text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          Créer un engagement
        </Link>
        <Link
          to="/how-it-works"
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-[border-color,transform] rounded-md px-6 py-3 text-sm"
        >
          Comment ça marche ?
        </Link>
      </div>

      {ongoingCount > 0 && (
        <p className="anim-fade-up text-sm text-[var(--text-faint)]" style={{ '--d': '400ms' }}>
          Tu as {ongoingCount} engagement{ongoingCount > 1 ? 's' : ''} en cours.{' '}
          <Link to="/engagements" className="text-[var(--accent)] hover:underline">
            Voir mes engagements
          </Link>
        </p>
      )}
      </div>
    </div>
  )
}
