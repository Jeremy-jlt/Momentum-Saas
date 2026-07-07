import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { SkeletonBlock } from '../components/Skeleton'
import { getCached, setCached } from '../utils/dataCache'
import { useToast } from '../components/Toast'
import EmptyState, { EngagementsIllustration } from '../components/EmptyState'

const STATUS_STYLES = {
  en_cours: { label: 'En cours', dot: 'bg-[var(--text-subtle)]' },
  reussi: { label: 'Réussi', dot: 'bg-[var(--accent)]' },
  echoue: { label: 'Échoué', dot: 'bg-[var(--danger)]' },
}

export default function Engagements() {
  const { user } = useAuth()
  const showToast = useToast()
  const cacheKey = `engagements:${user.id}`
  const cached = getCached(cacheKey)

  const [engagements, setEngagements] = useState(() => cached ?? [])
  const [loading, setLoading] = useState(() => cached === undefined)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchEngagements() {
      if (getCached(cacheKey) === undefined) setLoading(true)
      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (!error) {
        setEngagements(data ?? [])
        setCached(cacheKey, data ?? [])
      } else {
        showToast('Impossible de charger tes engagements.', 'error')
      }
      setLoading(false)
    }

    fetchEngagements()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleDelete = async (id) => {
    const { error } = await supabase.from('engagements').delete().eq('id', id)
    if (!error) {
      setEngagements((prev) => prev.filter((e) => e.id !== id))
      setCached(cacheKey, engagements.filter((e) => e.id !== id))
      showToast('Engagement supprimé.', 'success')
    } else {
      showToast("La suppression de l'engagement a échoué.", 'error')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-3">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
    )
  }

  if (engagements.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6">
        <EmptyState
          illustration={<EngagementsIllustration />}
          title="Ton premier engagement t'attend"
          description="Le premier pas vers plus de concentration commence maintenant."
          ctaLabel="Créer un engagement"
          ctaTo="/new"
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Mes engagements</h1>

      <div className="flex flex-col gap-4">
        {engagements.map((eng, i) => {
          const status = STATUS_STYLES[eng.statut] ?? STATUS_STYLES.en_cours
          return (
            <div
              key={eng.id}
              style={{ '--d': `${i * 60}ms` }}
              className="anim-fade-up card-glass border border-[var(--border)] rounded-lg p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    <span className="text-xs text-[var(--text-faint)]">{status.label}</span>
                  </div>
                  <h2 className="font-bold text-lg">{eng.nom}</h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  {eng.statut === 'en_cours' && (
                    <Link
                      to={`/verify?id=${eng.id}`}
                      className="text-xs border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-3 py-2"
                    >
                      Vérifier
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(eng.id)}
                    className="text-xs border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-3 py-2"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="num text-sm text-[var(--text-faint)] flex flex-wrap gap-x-6 gap-y-1">
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
                      className="text-xs border border-[var(--border)] text-[var(--text-muted)] rounded-full px-3 py-1"
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
