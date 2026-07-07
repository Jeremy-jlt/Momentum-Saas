import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { THEMES, useTheme } from '../contexts/ThemeContext'
import { supabase } from '../supabaseClient'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useIsPro } from '../hooks/useIsPro'
import { useReminderPrefs } from '../hooks/useReminderPrefs'

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lu' },
  { id: 2, label: 'Ma' },
  { id: 3, label: 'Me' },
  { id: 4, label: 'Je' },
  { id: 5, label: 'Ve' },
  { id: 6, label: 'Sa' },
  { id: 0, label: 'Di' },
]

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
  const showToast = useToast()

  const isPro = useIsPro()
  const [reminderPrefs, setReminderPref] = useReminderPrefs()

  const handleToggleReminders = async () => {
    if (!reminderPrefs.enabled) {
      if (typeof Notification === 'undefined') {
        showToast('Les notifications ne sont pas supportées par ce navigateur.', 'error')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Autorisation refusée — active les notifications dans ton navigateur.', 'error')
        return
      }
    }
    setReminderPref('enabled', !reminderPrefs.enabled)
  }

  const toggleReminderDay = (dayId) => {
    setReminderPref(
      'days',
      reminderPrefs.days.includes(dayId)
        ? reminderPrefs.days.filter((d) => d !== dayId)
        : [...reminderPrefs.days, dayId]
    )
  }

  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  const [showExportLockModal, setShowExportLockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)

  const previewThemeHover = (id) => {
    document.documentElement.dataset.theme = id
  }
  const clearThemePreview = () => {
    document.documentElement.dataset.theme = theme
  }

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

    if (habitudesRes.error || completionsRes.error) {
      showToast("L'export a échoué. Réessaie dans un instant.", 'error')
      return
    }

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
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-faint)] mb-1">Email</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">{user?.email}</p>

          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Envoi...' : 'Changer de mot de passe'}
          </button>

          {resetSent && (
            <p className="text-[var(--accent)] text-sm mt-3">Email envoyé à {user?.email}</p>
          )}
          {resetError && <p className="text-[var(--danger)] text-sm mt-3">{resetError}</p>}
        </div>
      </section>

      {/* Rappels */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold">Rappels</h2>
          <span className="text-[9px] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
            Pro
          </span>
        </div>
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          {!isPro ? (
            <p className="text-sm text-[var(--text-faint)]">
              Les rappels d'habitudes sont réservés au plan Discipline+.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-5">
                <span className="text-sm text-[var(--text-muted)]">Activer les rappels d'habitudes</span>
                <button
                  type="button"
                  onClick={handleToggleReminders}
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                    reminderPrefs.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      reminderPrefs.enabled ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {reminderPrefs.enabled && (
                <>
                  <div className="mb-5">
                    <p className="text-xs text-[var(--text-faint)] mb-2">Heure du rappel</p>
                    <input
                      type="time"
                      value={reminderPrefs.time}
                      onChange={(e) => setReminderPref('time', e.target.value)}
                      className="bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-faint)] mb-2">Jours actifs</p>
                    <div className="flex items-center gap-1.5">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleReminderDay(d.id)}
                          className={`w-8 h-8 rounded-md text-[11px] font-bold transition-colors ${
                            reminderPrefs.days.includes(d.id)
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                              : 'bg-[var(--surface-3)] text-[var(--text-faint)]'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-[var(--text-faint)] mt-4">
                    Le rappel ne se déclenche que si l'onglet Momentum est ouvert — les
                    notifications système hors-ligne nécessitent une intégration serveur à venir.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Apparence */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Apparence</h2>
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <p className="text-xs text-[var(--text-faint)] mb-4">Thème de l'interface</p>
          <div className="flex flex-wrap gap-5">
            {THEMES.map((t) => (
              <div key={t.id} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setTheme(t.id)}
                  onMouseEnter={() => previewThemeHover(t.id)}
                  onMouseLeave={clearThemePreview}
                  aria-label={`Thème ${t.label}`}
                  aria-pressed={theme === t.id}
                  className={`relative w-8 h-8 rounded-full transition-transform duration-150 ${
                    theme === t.id ? 'scale-110 ring-2 ring-[var(--text-strong)] ring-offset-2 ring-offset-[var(--surface-2)]' : ''
                  }`}
                  style={{ background: t.bg, border: '1px solid var(--border)' }}
                >
                  <span
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                    style={{ background: t.accent, border: '1px solid var(--surface-2)' }}
                  />
                </button>
                <span
                  className={`text-[10px] ${theme === t.id ? 'text-[var(--text-strong)] font-bold' : 'text-[var(--text-faint)]'}`}
                >
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Abonnement */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">Abonnement</h2>
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <span
            className={`inline-block text-[10px] font-bold uppercase tracking-[0.14em] rounded-[4px] px-2 py-1 mb-4 ${
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
        <div className="card-glass border border-[var(--border)] rounded-lg p-5 flex flex-col gap-3">
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
