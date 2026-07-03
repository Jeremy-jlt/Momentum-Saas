import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

const STATUS_STYLES = {
  en_cours: { label: 'En cours', dot: 'bg-gray-400' },
  reussi: { label: 'Réussi', dot: 'bg-emerald-500' },
  echoue: { label: 'Échoué', dot: 'bg-red-500' },
}

export default function Engagements() {
  const { user } = useAuth()
  const [engagements, setEngagements] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEngagements = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error) setEngagements(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchEngagements()
  }, [user])

  const handleDelete = async (id) => {
    const { error } = await supabase.from('engagements').delete().eq('id', id)
    if (!error) {
      setEngagements((prev) => prev.filter((e) => e.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  if (engagements.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Aucun engagement pour le moment</h1>
        <p className="text-gray-400 mb-8">
          Le premier pas vers plus de concentration commence maintenant.
        </p>
        <Link
          to="/new"
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Créer un engagement
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Mes engagements</h1>

      <div className="flex flex-col gap-4">
        {engagements.map((eng) => {
          const status = STATUS_STYLES[eng.statut] ?? STATUS_STYLES.en_cours
          return (
            <div
              key={eng.id}
              className="border border-gray-800 rounded-lg p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    <span className="text-xs text-gray-400">{status.label}</span>
                  </div>
                  <h2 className="font-bold text-lg">{eng.nom}</h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  {eng.statut === 'en_cours' && (
                    <Link
                      to={`/verify?id=${eng.id}`}
                      className="text-xs border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-3 py-2"
                    >
                      Vérifier
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(eng.id)}
                    className="text-xs border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-3 py-2"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
                <span>{eng.duree_jours} jours</span>
                <span>{eng.mise_euros} €</span>
                <span>
                  {eng.heure_debut} — {eng.heure_fin}
                </span>
                <span>
                  Créé le {new Date(eng.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {Array.isArray(eng.sites_bloques) && eng.sites_bloques.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {eng.sites_bloques.map((site) => (
                    <span
                      key={site}
                      className="text-xs border border-gray-700 text-gray-300 rounded-full px-3 py-1"
                    >
                      {site}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
