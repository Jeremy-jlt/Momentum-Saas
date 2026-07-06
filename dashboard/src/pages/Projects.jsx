import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import ProjectForm from '../components/ProjectForm'
import OfflineBanner from '../components/OfflineBanner'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatDurationMinutes, formatRelativeDate } from '../utils/dateUtils'
import { useToast } from '../components/Toast'

export default function Projects() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const showToast = useToast()

  const [projets, setProjets] = useState([])
  const [sessions, setSessions] = useState([])
  const [habitudes, setHabitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function load() {
    setLoading(true)
    const [projetsRes, sessionsRes, habitudesRes] = await Promise.all([
      supabase
        .from('projets')
        .select('*')
        .eq('user_id', user.id)
        .eq('actif', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('sessions_travail')
        .select('projet_id, duree_minutes, created_at')
        .eq('user_id', user.id),
      supabase.from('habitudes').select('id, nom, emoji').eq('user_id', user.id).eq('actif', true),
    ])

    setProjets(projetsRes.data ?? [])
    setSessions(sessionsRes.data ?? [])
    setHabitudes(habitudesRes.data ?? [])
    setLoading(false)
  }

  const habitudeById = useMemo(() => new Map(habitudes.map((h) => [h.id, h])), [habitudes])

  const statsByProjet = useMemo(() => {
    const map = new Map()
    sessions.forEach((s) => {
      const cur = map.get(s.projet_id) || { count: 0, totalMinutes: 0, lastDate: null }
      cur.count += 1
      cur.totalMinutes += s.duree_minutes
      if (!cur.lastDate || new Date(s.created_at) > new Date(cur.lastDate)) {
        cur.lastDate = s.created_at
      }
      map.set(s.projet_id, cur)
    })
    return map
  }, [sessions])

  const handleCreate = async (payload) => {
    const { error } = await supabase.from('projets').insert({ ...payload, user_id: user.id })
    if (error) {
      showToast('La création du projet a échoué.', 'error')
      throw error
    }
    setShowCreateModal(false)
    showToast('Projet créé.', 'success')
    load()
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Projets</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-4 py-2 text-sm"
        >
          + Nouveau projet
        </button>
      </div>

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h3 className="font-bold text-lg mb-4">Nouveau projet</h3>
          <ProjectForm
            habitudes={habitudes}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateModal(false)}
            submitLabel="Créer"
          />
        </Modal>
      )}

      {projets.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-400 mb-6">
            Aucun projet pour le moment. Lie tes sessions de travail à un projet
            pour suivre ton temps.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
          >
            Créer mon premier projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projets.map((p) => {
            const stats = statsByProjet.get(p.id) || { count: 0, totalMinutes: 0, lastDate: null }
            const habitude = p.habitude_id ? habitudeById.get(p.habitude_id) : null

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5 cursor-pointer hover:border-gray-600 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full inline-block mb-3"
                  style={{ background: p.couleur }}
                />
                <h2 className="font-bold text-lg mb-1">{p.nom}</h2>
                {habitude && (
                  <span className="inline-block text-[11px] border border-gray-700 text-gray-400 rounded-full px-2 py-1 mb-2">
                    {habitude.emoji} {habitude.nom}
                  </span>
                )}
                <div className="text-xs text-gray-500 flex flex-col gap-1 mt-2">
                  <span>
                    {stats.count} session{stats.count > 1 ? 's' : ''}
                  </span>
                  <span>{formatDurationMinutes(stats.totalMinutes)} au total</span>
                  <span>{formatRelativeDate(stats.lastDate)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </>
  )
}
