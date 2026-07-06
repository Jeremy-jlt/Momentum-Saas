import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import ProjectForm from '../components/ProjectForm'
import { useToast } from '../components/Toast'
import { formatDurationMinutes, parseISODate, toISODate } from '../utils/dateUtils'

const SESSIONS_PAGE_SIZE = 20

function formatSessionDateTime(dateStr, heureDebut, heureFin) {
  const date = parseISODate(dateStr)
  const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1)
  const hd = heureDebut.slice(0, 5).replace(':', 'h')
  const hf = heureFin.slice(0, 5).replace(':', 'h')
  return `${capitalized} · ${hd} → ${hf}`
}

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const showToast = useToast()

  const [projet, setProjet] = useState(null)
  const [sessions, setSessions] = useState([])
  const [habitudes, setHabitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PAGE_SIZE)

  useEffect(() => {
    if (user && id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  async function load() {
    setLoading(true)
    const [projetRes, sessionsRes, habitudesRes] = await Promise.all([
      supabase.from('projets').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase
        .from('sessions_travail')
        .select('*')
        .eq('projet_id', id)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('heure_debut', { ascending: false }),
      supabase.from('habitudes').select('id, nom, emoji').eq('user_id', user.id).eq('actif', true),
    ])

    if (projetRes.error) {
      setError("Ce projet n'existe pas ou ne t'appartient pas.")
    } else {
      setProjet(projetRes.data)
    }
    setSessions(sessionsRes.data ?? [])
    setHabitudes(habitudesRes.data ?? [])
    setLoading(false)
  }

  const habitudeLiee = useMemo(
    () => (projet?.habitude_id ? habitudes.find((h) => h.id === projet.habitude_id) : null),
    [projet, habitudes]
  )

  const totalMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + s.duree_minutes, 0),
    [sessions]
  )
  const joursActifs = useMemo(() => new Set(sessions.map((s) => s.date)).size, [sessions])

  const chartData = useMemo(() => {
    const byDate = new Map()
    sessions.forEach((s) => {
      byDate.set(s.date, (byDate.get(s.date) || 0) + s.duree_minutes)
    })
    const points = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = toISODate(d)
      points.push({
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        minutes: byDate.get(iso) || 0,
      })
    }
    return points
  }, [sessions])

  const handleUpdate = async (payload) => {
    const { error: updateError } = await supabase.from('projets').update(payload).eq('id', id)
    if (updateError) {
      showToast('La modification du projet a échoué.', 'error')
      throw updateError
    }
    setShowEditModal(false)
    showToast('Projet mis à jour.', 'success')
    load()
  }

  const handleDelete = async () => {
    const { error: deleteError } = await supabase.from('projets').delete().eq('id', id)
    if (deleteError) {
      setShowDeleteModal(false)
      showToast('La suppression du projet a échoué.', 'error')
      return
    }
    navigate('/projects')
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  if (error || !projet) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-red-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/projects')}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
        >
          Retour aux projets
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full shrink-0" style={{ background: projet.couleur }} />
          <h1 className="text-3xl font-bold">{projet.nom}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="text-xs border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-3 py-2"
          >
            Modifier ✏
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-xs border border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400 transition-colors rounded-md px-3 py-2"
          >
            Supprimer 🗑
          </button>
        </div>
      </div>

      {projet.description && <p className="text-gray-400 text-sm mb-4">{projet.description}</p>}

      {habitudeLiee && (
        <span className="inline-block text-xs border border-gray-700 text-gray-400 rounded-full px-3 py-1 mb-6">
          Lié à {habitudeLiee.emoji} {habitudeLiee.nom}
        </span>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400 mb-10">
        <span>
          {sessions.length} session{sessions.length > 1 ? 's' : ''}
        </span>
        <span>·</span>
        <span>{formatDurationMinutes(totalMinutes)} au total</span>
        <span>·</span>
        <span>
          {joursActifs} jour{joursActifs > 1 ? 's' : ''} actif{joursActifs > 1 ? 's' : ''}
        </span>
      </div>

      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h3 className="font-bold text-lg mb-4">Modifier le projet</h3>
          <ProjectForm
            initial={projet}
            habitudes={habitudes}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditModal(false)}
            submitLabel="Enregistrer"
          />
        </Modal>
      )}

      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <h3 className="font-bold text-lg mb-2">Supprimer ce projet ?</h3>
          <p className="text-sm text-gray-300 mb-6">
            Cette action supprimera définitivement le projet et toutes ses sessions
            de travail enregistrées. Cette action est irréversible.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 transition-colors text-white font-bold rounded-md px-4 py-2 text-sm"
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}

      <div className="border border-gray-800 rounded-lg p-4 mb-10">
        <p className="text-sm text-gray-300 mb-4">Activité sur 30 jours</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickMargin={8} />
              <YAxis stroke="#6b7280" fontSize={11} width={40} tickFormatter={(v) => `${v}min`} />
              <Tooltip
                contentStyle={{
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [`${value} min`, 'Temps travaillé']}
              />
              <Bar dataKey="minutes" fill={projet.couleur} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Sessions de travail</h2>

      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucune session enregistrée pour ce projet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {sessions.slice(0, visibleCount).map((s) => (
              <div key={s.id} className="border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                  <span className="text-xs text-gray-500">
                    {formatSessionDateTime(s.date, s.heure_debut, s.heure_fin)}
                  </span>
                  <span className="text-xs text-gray-400">{formatDurationMinutes(s.duree_minutes)}</span>
                </div>
                <p className="font-bold mb-2">{s.tache}</p>
                {Array.isArray(s.sites_bloques) && s.sites_bloques.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {s.sites_bloques.map((site) => (
                      <span
                        key={site}
                        className="text-[11px] border border-gray-700 text-gray-400 rounded-full px-2 py-1"
                      >
                        {site}
                      </span>
                    ))}
                  </div>
                )}
                {s.completion_creee && habitudeLiee && (
                  <span className="inline-block text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-1">
                    ✓ {habitudeLiee.nom} cochée
                  </span>
                )}
              </div>
            ))}
          </div>

          {visibleCount < sessions.length && (
            <div className="text-center mt-6">
              <button
                onClick={() => setVisibleCount((v) => v + SESSIONS_PAGE_SIZE)}
                className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
              >
                Afficher plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
