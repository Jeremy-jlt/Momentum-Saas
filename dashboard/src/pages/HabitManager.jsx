import { useEffect, useRef, useState } from 'react'
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
import { useToast } from '../components/Toast'

const DEFAULT_OBJECTIF_JOURS = 30

function EmojiPicker({ onSelect, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 mt-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-3 w-72 shadow-lg">
        {EMOJI_PICKER_GROUPS.map((group) => (
          <div key={group.title} className="mb-2 last:mb-0">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-1">
              {group.title}
            </p>
            <div className="flex flex-wrap gap-1">
              {group.emojis.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onSelect(e)}
                  className="text-lg hover:bg-[var(--surface-3)] rounded p-1 transition-colors"
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
  const [justDropped, setJustDropped] = useState(false)
  const wasDragging = useRef(false)

  useEffect(() => {
    if (wasDragging.current && !isDragging) {
      setJustDropped(true)
      const timeoutId = setTimeout(() => setJustDropped(false), 150)
      wasDragging.current = isDragging
      return () => clearTimeout(timeoutId)
    }
    wasDragging.current = isDragging
  }, [isDragging])

  const style = {
    transform: transform
      ? `${CSS.Transform.toString(transform)}${isDragging ? ' rotate(1.5deg)' : ''}`
      : undefined,
    // @dnd-kit n'expose qu'une chaîne de transition CSS, pas une API physique
    // ({damping, stiffness} demandé) : on approxime le ressort avec un
    // cubic-bezier à léger dépassement plutôt que l'easing linéaire par défaut.
    transition: transition
      ? transition.replace(/cubic-bezier\([^)]*\)|\bease[a-z-]*\b/i, 'cubic-bezier(0.34, 1.56, 0.64, 1)')
      : transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center flex-wrap gap-3 rounded-md px-3 py-2 hover:bg-[var(--surface-1)] transition-colors ${
        isDragging ? 'relative z-10 opacity-70 shadow-[0_8px_24px_rgba(0,0,0,0.4)] bg-[var(--surface-1)]' : ''
      } ${justDropped ? 'animate-[drop-bounce_150ms_ease-out]' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="text-[var(--text-subtle)] hover:text-[var(--text-faint)] cursor-grab active:cursor-grabbing shrink-0 text-lg leading-none px-1"
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
  const showToast = useToast()

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
    const { error: updateError } = await supabase.from('habitudes').update(patch).eq('id', id)

    if (updateError) {
      showToast("La modification n'a pas pu être enregistrée.", 'error')
    }
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
      showToast("Le nouvel ordre n'a pas pu être enregistré.", 'error')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Es-tu sûr ? Cette action supprimera aussi toutes tes coches pour cette habitude."
    )
    if (!confirmed) return

    setHabitudes((prev) => prev.filter((h) => h.id !== id))
    const { error: deleteError } = await supabase.from('habitudes').delete().eq('id', id)

    if (deleteError) {
      showToast("La suppression de l'habitude a échoué.", 'error')
    } else {
      showToast('Habitude supprimée.', 'success')
    }
  }

  const handleDeleteAll = async () => {
    setHabitudes([])
    setShowDeleteAllModal(false)
    const { error: deleteAllError } = await supabase
      .from('habitudes')
      .delete()
      .eq('user_id', user.id)

    if (deleteAllError) {
      showToast('La suppression des habitudes a échoué.', 'error')
    } else {
      showToast('Toutes les habitudes ont été supprimées.', 'success')
    }
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
      showToast("L'ajout de l'habitude a échoué.", 'error')
      return
    }

    setHabitudes((prev) => [...prev, data])
    setNewNom('')
    setNewEmoji('🎯')
    setNewCategorie('Autre')
    showToast('Habitude ajoutée.', 'success')
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-[var(--text-faint)]">
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
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
        >
          Changer de template
        </button>
      </div>

      <div className="border-l-2 border-[var(--accent)] pl-5 py-2 mb-8 bg-[var(--surface-2)] text-[var(--text-muted)] text-sm rounded-r">
        Tes habitudes sont entièrement personnalisables. Renomme-les, change leur
        emoji, réorganise-les (glisse la poignée ⠿) ou ajoute-en de nouvelles.
      </div>

      {!isPro && (
        <p className="text-xs text-[var(--text-faint)] mb-6">
          {activeCount}/{FREE_HABIT_LIMIT} habitudes actives (plan gratuit)
        </p>
      )}

      {showTemplateModal && (
        <Modal onClose={() => setShowTemplateModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Changer de template va ajouter les nouvelles habitudes à ta liste
            existante. Tes habitudes actuelles et toutes tes coches seront
            conservées. Tu pourras ensuite supprimer ce que tu ne veux pas garder.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowTemplateModal(false)}
              className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={() => navigate('/habits/templates?mode=add')}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-2 text-sm"
            >
              Continuer
            </button>
          </div>
        </Modal>
      )}

      {showDeleteAllModal && (
        <Modal onClose={() => setShowDeleteAllModal(false)}>
          <h3 className="font-bold text-lg mb-2">Supprimer toutes les habitudes ?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Cette action supprimera définitivement toutes tes habitudes ET toutes
            tes coches. Cette action est irréversible.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteAll}
              className="bg-[var(--danger)] hover:bg-[var(--danger-strong)] transition-colors text-white font-bold rounded-md px-4 py-2 text-sm"
            >
              Tout supprimer
            </button>
          </div>
        </Modal>
      )}

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

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
                    className="text-2xl hover:bg-[var(--surface-3)] rounded p-1"
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
                      className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingNameId(h.id)}
                      className="text-sm text-[var(--text-muted)] hover:bg-[var(--surface-1)] rounded px-1 py-0.5 text-left"
                    >
                      {h.nom} <span className="text-[var(--text-subtle)]">✏️</span>
                    </button>
                  )}
                </div>

                <select
                  value={h.categorie || ''}
                  onChange={(e) => updateHabitude(h.id, { categorie: e.target.value })}
                  className="bg-transparent border border-[var(--border)] rounded text-xs px-2 py-1.5 text-[var(--text-muted)] shrink-0"
                >
                  <option value="">—</option>
                  {HABIT_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[var(--surface-0)]">
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
                        className="w-14 bg-transparent border border-[var(--border)] rounded text-xs px-2 py-1.5 text-[var(--text-muted)]"
                      />
                      <span className="text-[10px] text-[var(--text-faint)]">j/mois</span>
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        disabled
                        value={h.objectif_jours ?? DEFAULT_OBJECTIF_JOURS}
                        className="w-14 bg-transparent border border-[var(--border)] rounded text-xs px-2 py-1.5 text-[var(--text-subtle)] cursor-not-allowed"
                      />
                      <span className="text-[10px] text-[var(--text-subtle)]">🔒 Plan Discipline+</span>
                    </>
                  )}
                </div>

                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <span className="text-[11px] text-[var(--text-faint)]">{h.actif ? 'Actif' : 'Inactif'}</span>
                  <input
                    type="checkbox"
                    checked={h.actif}
                    onChange={() => handleToggleActif(h)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </label>

                <button
                  onClick={() => handleDelete(h.id)}
                  className="text-xs border border-[var(--border)] text-[var(--text-faint)] hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors rounded-md px-2 py-1.5 shrink-0"
                >
                  Supprimer
                </button>
              </SortableHabitRow>
            ))}

            {habitudes.length === 0 && (
              <p className="text-[var(--text-faint)] text-sm px-3 py-6 text-center">
                Aucune habitude pour l'instant — ajoute-en une ci-dessous.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="border border-[var(--border)] rounded-lg p-4 mb-6">
        <p className="text-xs text-[var(--text-faint)] mb-3">Ajouter une habitude</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNewPickerOpen((v) => !v)}
              className="text-2xl hover:bg-[var(--surface-3)] rounded p-1"
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
            className="flex-1 min-w-[160px] bg-transparent border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />

          <select
            value={newCategorie}
            onChange={(e) => setNewCategorie(e.target.value)}
            className="bg-transparent border border-[var(--border)] rounded-md text-sm px-3 py-2 text-[var(--text-muted)]"
          >
            {HABIT_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[var(--surface-0)]">
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {adding ? 'Ajout...' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {habitudes.length > 0 && (
        <div className="text-center mb-10">
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="border border-[var(--danger)]/40 text-[var(--danger)] hover:border-[var(--danger)]/70 transition-colors rounded-md px-4 py-2 text-sm bg-transparent"
          >
            Tout supprimer 🗑
          </button>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => navigate('/habits')}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          Terminer et voir ma grille →
        </button>
      </div>
      </div>
    </>
  )
}
