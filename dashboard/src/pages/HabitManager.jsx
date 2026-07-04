import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { EMOJI_PICKER_GROUPS, HABIT_CATEGORIES } from '../data/habitOptions'

function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 w-72 shadow-lg">
        {EMOJI_PICKER_GROUPS.map((group) => (
          <div key={group.title} className="mb-2 last:mb-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1">
              {group.emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onSelect(e)}
                  className="text-lg hover:bg-[#2a2a2a] rounded p-1 transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function HabitManager() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [habitudes, setHabitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingNameId, setEditingNameId] = useState(null)
  const [openPickerId, setOpenPickerId] = useState(null)

  const [newNom, setNewNom] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎯')
  const [newCategorie, setNewCategorie] = useState('Autre')
  const [newPickerOpen, setNewPickerOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('habitudes')
        .select('*')
        .eq('user_id', user.id)
        .order('ordre', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setHabitudes(data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const updateHabitude = async (id, patch) => {
    setHabitudes((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)))
    await supabase.from('habitudes').update(patch).eq('id', id)
  }

  const swapOrdre = async (a, b) => {
    const aOrdre = a.ordre
    const bOrdre = b.ordre

    setHabitudes((prev) =>
      prev
        .map((h) => {
          if (h.id === a.id) return { ...h, ordre: bOrdre }
          if (h.id === b.id) return { ...h, ordre: aOrdre }
          return h
        })
        .sort((x, y) => (x.ordre ?? 0) - (y.ordre ?? 0))
    )

    await Promise.all([
      supabase.from('habitudes').update({ ordre: bOrdre }).eq('id', a.id),
      supabase.from('habitudes').update({ ordre: aOrdre }).eq('id', b.id),
    ])
  }

  const moveUp = (index) => {
    if (index === 0) return
    swapOrdre(habitudes[index], habitudes[index - 1])
  }

  const moveDown = (index) => {
    if (index === habitudes.length - 1) return
    swapOrdre(habitudes[index], habitudes[index + 1])
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Es-tu sûr ? Cette action supprimera aussi toutes tes coches pour cette habitude."
    )
    if (!confirmed) return

    setHabitudes((prev) => prev.filter((h) => h.id !== id))
    await supabase.from('habitudes').delete().eq('id', id)
  }

  const handleAdd = async () => {
    if (!newNom.trim()) {
      setError("Donne un nom à ta nouvelle habitude.")
      return
    }
    setError('')
    setAdding(true)

    const maxOrdre = habitudes.reduce((max, h) => Math.max(max, h.ordre ?? 0), -1)
    const payload = {
      user_id: user.id,
      nom: newNom.trim(),
      emoji: newEmoji,
      categorie: newCategorie,
      ordre: maxOrdre + 1,
      actif: true,
      template: null,
    }

    const { data, error: insertError } = await supabase
      .from('habitudes')
      .insert(payload)
      .select()
      .single()

    setAdding(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setHabitudes((prev) => [...prev, data])
    setNewNom('')
    setNewEmoji('🎯')
    setNewCategorie('Autre')
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Gérer mes habitudes</h1>

      <div className="border-l-2 border-emerald-500 pl-5 py-2 mb-8 bg-[#141414] text-gray-300 text-sm rounded-r">
        Tes habitudes sont entièrement personnalisables. Renomme-les, change leur
        emoji, réorganise-les ou ajoute-en de nouvelles.
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex flex-col gap-2 mb-8">
        {habitudes.map((h, index) => (
          <div
            key={h.id}
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
              >
                ▲
              </button>
              <button
                onClick={() => moveDown(index)}
                disabled={index === habitudes.length - 1}
                className="text-gray-500 hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
              >
                ▼
              </button>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenPickerId(openPickerId === h.id ? null : h.id)}
                className="text-2xl hover:bg-[#2a2a2a] rounded p-1"
              >
                {h.emoji || '🎯'}
              </button>
              {openPickerId === h.id && (
                <EmojiPicker
                  onSelect={(e) => {
                    updateHabitude(h.id, { emoji: e })
                    setOpenPickerId(null)
                  }}
                  onClose={() => setOpenPickerId(null)}
                />
              )}
            </div>

            <div className="flex-1 min-w-[140px]">
              {editingNameId === h.id ? (
                <input
                  autoFocus
                  defaultValue={h.nom}
                  onBlur={(e) => {
                    updateHabitude(h.id, { nom: e.target.value.trim() || h.nom })
                    setEditingNameId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <button
                  onClick={() => setEditingNameId(h.id)}
                  className="text-sm text-gray-200 hover:bg-[#1a1a1a] rounded px-1 py-0.5 text-left"
                >
                  {h.nom} <span className="text-gray-600">✏️</span>
                </button>
              )}
            </div>

            <select
              value={h.categorie || ''}
              onChange={(e) => updateHabitude(h.id, { categorie: e.target.value })}
              className="bg-transparent border border-gray-700 rounded text-xs px-2 py-1.5 text-gray-300 shrink-0"
            >
              <option value="">—</option>
              {HABIT_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0a0a0a]">
                  {c}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
              <span className="text-[11px] text-gray-500">{h.actif ? 'Actif' : 'Inactif'}</span>
              <input
                type="checkbox"
                checked={h.actif}
                onChange={() => updateHabitude(h.id, { actif: !h.actif })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <button
              onClick={() => handleDelete(h.id)}
              className="text-xs border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors rounded-md px-2 py-1.5 shrink-0"
            >
              Supprimer
            </button>
          </div>
        ))}

        {habitudes.length === 0 && (
          <p className="text-gray-500 text-sm px-3 py-6 text-center">
            Aucune habitude pour l'instant — ajoute-en une ci-dessous.
          </p>
        )}
      </div>

      <div className="border border-gray-800 rounded-lg p-4 mb-10">
        <p className="text-xs text-gray-500 mb-3">Ajouter une habitude</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNewPickerOpen((v) => !v)}
              className="text-2xl hover:bg-[#2a2a2a] rounded p-1"
            >
              {newEmoji}
            </button>
            {newPickerOpen && (
              <EmojiPicker
                onSelect={(e) => {
                  setNewEmoji(e)
                  setNewPickerOpen(false)
                }}
                onClose={() => setNewPickerOpen(false)}
              />
            )}
          </div>

          <input
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            placeholder="Nom de l'habitude"
            className="flex-1 min-w-[160px] bg-transparent border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />

          <select
            value={newCategorie}
            onChange={(e) => setNewCategorie(e.target.value)}
            className="bg-transparent border border-gray-700 rounded-md text-sm px-3 py-2 text-gray-300"
          >
            {HABIT_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#0a0a0a]">
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {adding ? 'Ajout...' : '+ Ajouter'}
          </button>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => navigate('/habits')}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Terminer et voir ma grille →
        </button>
      </div>
    </div>
  )
}
