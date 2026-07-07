import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { useIsPro } from '../hooks/useIsPro'

const FREE_FEATURES = [
  'Jusqu\'à 5 habitudes actives',
  '2 templates gratuits',
  'Layout Focus uniquement',
  'Graphique en courbe uniquement',
]

const PRO_FEATURES = [
  'Habitudes illimitées',
  '5 templates Pro avec objectifs pré-configurés',
  '4 layouts (Focus, Dashboard, Compact, Zen)',
  '4 types de graphiques',
  'Tracker d\'humeur journalier',
  'Anneaux hebdomadaires',
  'Statistiques avancées + breakdown par catégorie',
  'Export CSV',
]

export default function Profile() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const isPro = useIsPro()

  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  const [showExportLockModal, setShowExportLockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)

  const handleResetPassword = async () => {
    setResetError('')
    setResetting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    setResetting(false)

    if (error) {
      setResetError(error.message)
      return
    }
    setResetSent(true)
  }

  const handleExport = async () => {
    if (!isPro) {
      setShowExportLockModal(true)
      return
    }

    const [habitudesRes, completionsRes] = await Promise.all([
      supabase.from('habitudes').select('id, nom').eq('user_id', user.id),
      supabase.from('completions').select('habitude_id, date').eq('user_id', user.id),
    ])

    const habitudeById = new Map((habitudesRes.data ?? []).map((h) => [h.id, h.nom]))
    const rows = [['habitude', 'date', 'statut']]
    ;(completionsRes.data ?? []).forEach((c) => {
      rows.push([habitudeById.get(c.habitude_id) || c.habitude_id, c.date, 'complétée'])
    })
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentum-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteConfirmed(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-10">Mon profil</h1>

      {/* Informations du compte */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Informations du compte</h2>
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-faint)] mb-1">Email</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">{user?.email}</p>

          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {resetting ? 'Envoi...' : 'Changer de mot de passe'}
          </button>

          {resetSent && (
            <p className="text-[var(--accent)] text-sm mt-3">Email envoyé à {user?.email}</p>
          )}
          {resetError && <p className="text-[var(--danger)] text-sm mt-3">{resetError}</p>}
        </div>
      </section>

      {/* Apparence */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Apparence</h2>
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-faint)] mb-3">Thème de l'interface</p>
          <div className="inline-flex rounded-md border border-[var(--border)] overflow-hidden">
            {[
              { id: 'dark', label: 'Sombre' },
              { id: 'light', label: 'Clair' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`px-4 py-2 text-sm transition-colors ${
                  theme === opt.id
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Abonnement */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Abonnement</h2>
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-5">
          <span
            className={`inline-block text-xs font-bold rounded-full px-3 py-1 mb-4 ${
              isPro ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
            }`}
          >
            {isPro ? 'Plan Discipline+' : 'Plan Gratuit'}
          </span>

          <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)] mb-4">
            {(isPro ? PRO_FEATURES : FREE_FEATURES).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-[var(--accent)] shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {!isPro && (
            <button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-2 text-sm">
              Passer à Discipline+
            </button>
          )}
        </div>
      </section>

      {/* Données */}
      <section>
        <h2 className="text-lg font-bold mb-4">Données</h2>
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-3">
          <button
            onClick={handleExport}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm self-start"
          >
            Exporter mes données
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="border border-[var(--danger)]/40 text-[var(--danger)] hover:border-[var(--danger)]/70 transition-colors rounded-md px-4 py-2 text-sm self-start"
          >
            Supprimer mon compte 🗑
          </button>
        </div>
      </section>

      {showExportLockModal && (
        <Modal onClose={() => setShowExportLockModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Fonctionnalité réservée au plan Discipline+ 🔒 — Débloque l'export de
            tes données.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowExportLockModal(false)}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-2 text-sm"
            >
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal onClose={closeDeleteModal}>
          {!deleteConfirmed ? (
            <>
              <h3 className="font-bold text-lg mb-2">Supprimer ton compte ?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Cette action supprimera définitivement ton compte et toutes tes
                données (habitudes, engagements, projets, sessions). Cette action
                est irréversible.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={closeDeleteModal}
                  className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={() => setDeleteConfirmed(true)}
                  className="bg-[var(--danger)] hover:bg-[var(--danger-strong)] transition-colors text-white font-bold rounded-md px-4 py-2 text-sm"
                >
                  Continuer
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Pour supprimer ton compte, contacte-nous à{' '}
                <span className="text-[var(--accent)]">support@momentum-app.fr</span>
              </p>
              <div className="flex justify-end">
                <button
                  onClick={closeDeleteModal}
                  className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
