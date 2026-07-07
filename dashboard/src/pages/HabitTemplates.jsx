import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { HABIT_TEMPLATES } from '../data/habitTemplates'
import { FREE_HABIT_LIMIT } from '../data/habitOptions'
import { useIsPro } from '../hooks/useIsPro'

export default function HabitTemplates() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAddMode = searchParams.get('mode') === 'add'

  const isPro = useIsPro()

  const [existingHabitudes, setExistingHabitudes] = useState([])
  const [creating, setCreating] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('habitudes')
      .select('nom, ordre, actif')
      .eq('user_id', user.id)
      .then(({ data }) => setExistingHabitudes(data ?? []))
  }, [user])

  const handleSelect = async (template) => {
    if (template.tier === 'pro' && !isPro) return

    setError('')

    const existingNomsLower = new Set(existingHabitudes.map((h) => h.nom.trim().toLowerCase()))
    const maxOrdre = existingHabitudes.reduce((max, h) => Math.max(max, h.ordre ?? 0), -1)

    const newHabitudes = template.habitudes.filter(
      (h) => !existingNomsLower.has(h.nom.trim().toLowerCase())
    )

    if (!isPro) {
      const activeExistingCount = existingHabitudes.filter((h) => h.actif).length
      if (activeExistingCount + newHabitudes.length > FREE_HABIT_LIMIT) {
        setError(
          `Limite atteinte — le plan gratuit est limité à ${FREE_HABIT_LIMIT} habitudes actives. Passe à Pro pour des habitudes illimitées.`
        )
        return
      }
    }

    setCreating(template.id)

    const rows = newHabitudes.map((h, i) => ({
      user_id: user.id,
      nom: h.nom,
      emoji: h.emoji,
      categorie: h.categorie,
      ordre: maxOrdre + 1 + i,
      actif: true,
      template: template.id,
      ...(h.objectif_jours ? { objectif_jours: h.objectif_jours } : {}),
    }))

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('habitudes').insert(rows)
      if (insertError) {
        setError(insertError.message)
        setCreating(null)
        return
      }
    }

    navigate('/habits/manage')
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Choisir un template</h1>

      <div className="border-l-2 border-[var(--accent)] pl-5 py-2 mb-10 bg-[var(--surface-2)] text-[var(--text-muted)] text-sm rounded-r">
        <p>
          Ces templates sont un point de départ. Tu pourras modifier, ajouter ou
          supprimer chaque habitude librement après avoir choisi.
        </p>
        {isAddMode && (
          <p className="mt-1">
            Les habitudes déjà présentes dans ta liste (même nom) ne seront pas
            dupliquées.
          </p>
        )}
      </div>

      {error && <p className="text-[var(--danger)] text-sm mb-6">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HABIT_TEMPLATES.map((template, i) => {
          const isProTemplate = template.tier === 'pro'
          const locked = isProTemplate && !isPro
          const isCreating = creating === template.id

          return (
            <div
              key={template.id}
              style={{ '--d': `${i * 60}ms` }}
              className="anim-fade-up card-hover relative bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{template.emoji}</span>
                {isProTemplate ? (
                  <span className="text-xs border border-[var(--border)] text-[var(--text-muted)] rounded-full px-2 py-1">
                    Pro 🔒
                  </span>
                ) : (
                  <span className="text-xs bg-[var(--accent)] text-[var(--accent-contrast)] font-bold rounded-full px-2 py-1">
                    Gratuit
                  </span>
                )}
              </div>

              <h2 className="font-bold text-lg mb-1">{template.titre}</h2>
              <p className="text-[var(--text-faint)] text-sm mb-4 flex-1">{template.description}</p>

              {template.habitudes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {template.habitudes.map((h) => (
                    <span
                      key={h.nom}
                      className="text-[11px] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-2 py-1"
                    >
                      {h.emoji} {h.nom}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleSelect(template)}
                disabled={locked || isCreating}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                  locked
                    ? 'border border-[var(--border)] text-[var(--text-faint)] cursor-not-allowed'
                    : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] disabled:opacity-50'
                }`}
              >
                {locked
                  ? 'Verrouillé'
                  : isCreating
                    ? 'Création...'
                    : template.id === 'personnalise'
                      ? 'Commencer de zéro'
                      : 'Choisir ce template'}
              </button>

              {locked && (
                <div className="absolute inset-0 bg-[var(--surface-0)]/60 rounded-lg flex items-center justify-center text-center px-6">
                  <p className="text-sm text-[var(--text-muted)]">
                    🔒 Disponible avec le plan Discipline+
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
