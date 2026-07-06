import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { EMOJI_PICKER_GROUPS, FREE_HABIT_LIMIT, HABIT_CATEGORIES } from '../data/habitOptions'
import Modal from '../components/Modal'
import OfflineBanner from '../components/OfflineBanner'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const DEFAULT_OBJECTIF_JOURS = 30

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

function SortableHabitRow({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center flex-wrap gap-3 rounded-md px-3 py-2 hover:bg-[#1a1a1a] transition-colors ${
        isDragging ? 'relative z-10 opacity-70 shadow-lg shadow-black/50 bg-[#1a1a1a]' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="text-[#4b5563] hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0 text-lg leading-none px-1"
        aria-label="Réorganiser cette habitude"
      >
        ⠿
      </button>
      {children}
    </div>
  )
}

export default function HabitManager() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  // Simule l'état Pro en attendant l'intégration Stripe.
  const isPro = true

  const [habitudes, setHabitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingNameId, setEditingNameId] = useState(null)
  const [openPickerId, setOpenPickerId] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)

  const [newNom, setNewNom] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎯')
  const [newCategorie, setNewCategorie] = useState('Autre')
  const [newPickerOpen, setNewPickerOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const activeCount = habitudes.filter((h) => h.actif).length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

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

  const handleToggleActif = (h) => {
    if (!h.actif && !isPro && activeCount >= FREE_HABIT_LIMIT) {
      setError(
        `Limite atteinte — passe à Pro pour des habitudes illimitées (max ${FREE_HABIT_LIMIT} en gratuit).`
      )
      return
    }
    setError('')
    updateHabitude(h.id, { actif: !h.actif })
  }

  const handleDragStart = (event) => {
    console.log('[dnd-kit] drag start', event.active.id)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    console.log('[dnd-kit] drag end', { active: active?.id, over: over?.id })

    if (!over || active.id === over.id) {
      console.log('[dnd-kit] no reorder needed (dropped on itself or outside a valid target)')
      return
    }

    const oldIndex = habitudes.findIndex((h) => h.id === active.id)
    const newIndex = habitudes.findIndex((h) => h.id === over.id)
    console.log('[dnd-kit] reordering', { oldIndex, newIndex })

    const reordered = arrayMove(habitudes, oldIndex, newIndex).map((h, i) => ({
      ...h,
      ordre: i,
    }))

    setHabitudes(reordered)

    const { error: reorderError } = await Promise.all(
      reordered.map((h, i) => supabase.from('habitudes').update({ ordre: i }).eq('id', h.id))
    ).then(
      (results) => ({ error: results.find((r) => r.error)?.error }),
      (err) => ({ error: err })
    )

    if (reorderError) {
      console.error('[dnd-kit] failed to persist new order', reorderError)
    } else {
      console.log('[dnd-kit] new order persisted to Supabase')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Es-tu sûr ? Cette action supprimera aussi toutes tes coches pour cette habitude."
    )
    if (!confirmed) return

    setHabitudes((prev) => prev.filter((h) => h.id !== id))
    await supabase.from('habitudes').delete().eq('id', id)
  }

  const handleDeleteAll = async () => {
    setHabitudes([])
    setShowDeleteAllModal(false)
    await supabase.from('habitudes').delete().eq('user_id', user.id)
  }

  const handleAdd = async () => {
    if (!newNom.trim()) {
      setError("Donne un nom à ta nouvelle habitude.")
      return
    }
    if (!isPro && activeCount >= FREE_HABIT_LIMIT) {
      setError(
        `Limite atteinte — passe à Pro pour des habitudes illimitées (max ${FREE_HABIT_LIMIT} en gratuit).`
      )
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
    <>
      <OfflineBanner isOnline={isOnline} />
      <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-3xl font-bold">Gérer mes habitudes</h1>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
        >
          Changer de template
        </button>
      </div>

      <div className="border-l-2 border-emerald-500 pl-5 py-2 mb-8 bg-[#141414] text-gray-300 text-sm rounded-r">
        Tes habitudes sont entièrement personnalisables. Renomme-les, change leur
        emoji, réorganise-les (glisse la poignée ⠿) ou ajoute-en de nouvelles.
      </div>

      {!isPro && (
        <p className="text-xs text-gray-500 mb-6">
          {activeCount}/{FREE_HABIT_LIMIT} habitudes actives (plan gratuit)
        </p>
      )}

      {showTemplateModal && (
        <Modal onClose={() => setShowTemplateModal(false)}>
          <p className="text-sm text-gray-200 mb-6">
            Changer de template va ajouter les nouvelles habitudes à ta liste
            existante. Tes habitudes actuelles et toutes tes coches seront
            conservées. Tu pourras ensuite supprimer ce que tu ne veux pas garder.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowTemplateModal(false)}
              className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={() => navigate('/habits/templates?mode=add')}
              className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-4 py-2 text-sm"
            >
              Continuer
            </button>
          </div>
        </Modal>
      )}

      {showDeleteAllModal && (
        <Modal onClose={() => setShowDeleteAllModal(false)}>
          <h3 className="font-bold text-lg mb-2">Supprimer toutes les habitudes ?</h3>
          <p className="text-sm text-gray-300 mb-6">
            Cette action supprimera définitivement toutes tes habitudes ET toutes
            tes coches. Cette action est irréversible.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold rounded-md px-4 py-2 text-sm"
            >
              Tout supprimer
            </button>
          </div>
        </Modal>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={habitudes.map((h) => h.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 mb-8">
            {habitudes.map((h) => (
              <SortableHabitRow key={h.id} id={h.id}>
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

                <div className="flex items-center gap-1.5 shrink-0" title="Objectif mensuel (jours)">
                  {isPro ? (
                    <>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={h.objectif_jours ?? DEFAULT_OBJECTIF_JOURS}
                        onChange={(e) =>
                          updateHabitude(h.id, { objectif_jours: Number(e.target.value) })
                        }
                        className="w-14 bg-transparent border border-gray-700 rounded text-xs px-2 py-1.5 text-gray-300"
                      />
                      <span className="text-[10px] text-gray-500">j/mois</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        disabled
                        value={h.objectif_jours ?? DEFAULT_OBJECTIF_JOURS}
                        className="w-14 bg-transparent border border-gray-800 rounded text-xs px-2 py-1.5 text-gray-600 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-gray-600">🔒 Plan Discipline+</span>
                    </>
                  )}
                </div>

                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <span className="text-[11px] text-gray-500">{h.actif ? 'Actif' : 'Inactif'}</span>
                  <input
                    type="checkbox"
                    checked={h.actif}
                    onChange={() => handleToggleActif(h)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>

                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-xs border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors rounded-md px-2 py-1.5 shrink-0"
                >
                  Supprimer
                </button>
              </SortableHabitRow>
            ))}

            {habitudes.length === 0 && (
              <p className="text-gray-500 text-sm px-3 py-6 text-center">
                Aucune habitude pour l'instant — ajoute-en une ci-dessous.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="border border-gray-800 rounded-lg p-4 mb-6">
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

      {habitudes.length > 0 && (
        <div className="text-center mb-10">
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="border border-red-500/40 text-red-400 hover:border-red-500/70 transition-colors rounded-md px-4 py-2 text-sm bg-transparent"
          >
            Tout supprimer 🗑
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate('/habits')}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Terminer et voir ma grille →
        </button>
      </div>
      </div>
    </>
  )
}
