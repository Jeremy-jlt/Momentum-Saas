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

  return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center">
      <h1 className="text-5xl md:text-6xl font-bold mb-4">Momentum</h1>
      <p className="text-lg text-gray-300 mb-6">
        Chaque jour compte. Chaque distraction coûte.
      </p>
      <p className="text-gray-400 max-w-xl mx-auto mb-10">
        Bloque les sites qui te distraient pendant tes sessions de travail sur
        ordinateur. Crée un engagement avec une mise symbolique, tiens ta
        promesse, et reprends le contrôle de tes heures de concentration.
      </p>

      <div className="flex items-center justify-center gap-4 mb-10">
        <Link
          to={user ? '/new' : '/login'}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Créer un engagement
        </Link>
        <Link
          to="/how-it-works"
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-6 py-3 text-sm"
        >
          Comment ça marche ?
        </Link>
      </div>

      {user && ongoingCount > 0 && (
        <p className="text-sm text-gray-400">
          Tu as {ongoingCount} engagement{ongoingCount > 1 ? 's' : ''} en cours.{' '}
          <Link to="/engagements" className="text-emerald-500 hover:underline">
            Voir mes engagements
          </Link>
        </p>
      )}
    </div>
  )
}
