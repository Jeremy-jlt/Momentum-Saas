import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { HABIT_TEMPLATES } from '../data/habitTemplates'

export default function HabitTemplates() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(null)
  const [error, setError] = useState('')

  const handleSelect = async (template) => {
    if (template.tier === 'pro') return

    setCreating(template.id)
    setError('')

    const rows = template.habitudes.map((h, i) => ({
      user_id: user.id,
      nom: h.nom,
      emoji: h.emoji,
      categorie: h.categorie,
      ordre: i,
      actif: true,
      template: template.id,
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

      <div className="border-l-2 border-emerald-500 pl-5 py-2 mb-10 bg-[#141414] text-gray-300 text-sm rounded-r">
        Ces templates sont un point de départ. Tu pourras modifier, ajouter ou
        supprimer chaque habitude librement après avoir choisi.
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HABIT_TEMPLATES.map((template) => {
          const isPro = template.tier === 'pro'
          const isCreating = creating === template.id

          return (
            <div
              key={template.id}
              className="relative bg-[#141414] border border-[#2a2a2a] rounded-lg p-5 flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{template.emoji}</span>
                {isPro ? (
                  <span className="text-xs border border-gray-700 text-gray-300 rounded-full px-2 py-1">
                    Pro 🔒
                  </span>
                ) : (
                  <span className="text-xs bg-emerald-500 text-black font-bold rounded-full px-2 py-1">
                    Gratuit
                  </span>
                )}
              </div>

              <h2 className="font-bold text-lg mb-1">{template.titre}</h2>
              <p className="text-gray-400 text-sm mb-4 flex-1">{template.description}</p>

              {template.habitudes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {template.habitudes.map((h) => (
                    <span
                      key={h.nom}
                      className="text-[11px] border border-gray-700 text-gray-400 rounded-full px-2 py-1"
                    >
                      {h.emoji} {h.nom}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleSelect(template)}
                disabled={isPro || isCreating}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                  isPro
                    ? 'border border-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-black disabled:opacity-50'
                }`}
              >
                {isPro
                  ? 'Verrouillé'
                  : isCreating
                    ? 'Création...'
                    : template.id === 'personnalise'
                      ? 'Commencer de zéro'
                      : 'Choisir ce template'}
              </button>

              {isPro && (
                <div className="absolute inset-0 bg-[#0a0a0a]/60 rounded-lg flex items-center justify-center text-center px-6">
                  <p className="text-sm text-gray-200">
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
