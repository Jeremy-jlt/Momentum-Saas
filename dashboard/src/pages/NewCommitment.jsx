import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { SITE_CATEGORIES } from '../data/siteCategories'

const DEFAULT_DUREE_JOURS = 14
const DEFAULT_MISE_EUROS = 10
const NOM_MAX = 60

export default function NewCommitment() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [nom, setNom] = useState('')
  const [selectedSites, setSelectedSites] = useState([])
  const [customSite, setCustomSite] = useState('')
  const [heureDebut, setHeureDebut] = useState('09:00')
  const [heureFin, setHeureFin] = useState('18:00')
  const [error, setError] = useState('')
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)

  const nomError = attemptedSubmit && !nom.trim() ? 'Donne un nom à ton engagement.' : ''
  const sitesError = attemptedSubmit && selectedSites.length === 0 ? 'Sélectionne au moins un site à bloquer.' : ''

  const toggleSite = (site) => {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    )
  }

  const addCustomSite = () => {
    const trimmed = customSite.trim()
    if (!trimmed) return
    if (!selectedSites.includes(trimmed)) {
      setSelectedSites((prev) => [...prev, trimmed])
    }
    setCustomSite('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setAttemptedSubmit(true)

    if (!nom.trim() || selectedSites.length === 0) {
      return
    }

    setSubmitting(true)
    const payload = {
      nom: nom.trim(),
      sites_bloques: selectedSites,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      duree_jours: DEFAULT_DUREE_JOURS,
      mise_euros: DEFAULT_MISE_EUROS,
      statut: 'en_cours',
      user_id: user.id,
    }

    const { error: insertError } = await supabase.from('engagements').insert(payload)
    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setCreated(payload)
  }

  if (created) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)] flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-[var(--accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Engagement créé</h1>
        <p className="text-[var(--text-faint)] mb-8">« {created.nom} » est maintenant en cours.</p>

        <div className="text-left card-glass border border-[var(--border)] rounded-lg p-6 mb-8 text-sm space-y-2">
          <p>
            <span className="text-[var(--text-faint)]">Sites bloqués : </span>
            {created.sites_bloques.join(', ')}
          </p>
          <p>
            <span className="text-[var(--text-faint)]">Horaires : </span>
            {created.heure_debut} — {created.heure_fin}
          </p>
        </div>

        <button
          onClick={() => navigate('/engagements')}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          Voir mes engagements
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Nouvel engagement</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-10">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-[var(--text-muted)]">Nom de l'engagement</label>
            {nom.length >= NOM_MAX * 0.8 && (
              <span
                className={`text-[11px] ${
                  nom.length >= NOM_MAX ? 'text-[var(--danger)]' : 'text-[var(--text-faint)]'
                }`}
              >
                {nom.length}/{NOM_MAX}
              </span>
            )}
          </div>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={NOM_MAX}
            placeholder="Ex : Semaine de deep work"
            className={`w-full bg-transparent border rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none ${
              nomError
                ? 'border-[var(--danger)]'
                : 'border-[var(--border)] focus:border-[var(--accent)]'
            }`}
          />
          {nomError && <p className="text-[var(--danger)] text-xs mt-1.5">{nomError}</p>}
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-4">Sites à bloquer</label>
          <div className="flex flex-col gap-5">
            {SITE_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <p className="text-xs uppercase tracking-wide text-[var(--text-faint)] mb-2">
                  {cat.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.sites.map((site) => {
                    const active = selectedSites.includes(site)
                    return (
                      <button
                        type="button"
                        key={site}
                        onClick={() => toggleSite(site)}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                          active
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                            : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {site}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-faint)] mb-2">
                Site personnalisé
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSites
                  .filter((s) => !SITE_CATEGORIES.some((c) => c.sites.includes(s)))
                  .map((site) => (
                    <button
                      type="button"
                      key={site}
                      onClick={() => toggleSite(site)}
                      className="text-xs rounded-full px-3 py-1.5 border bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)] font-bold"
                    >
                      {site}
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSite}
                  onChange={(e) => setCustomSite(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSite()
                    }
                  }}
                  placeholder="ex: monsite.com"
                  className="flex-1 bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={addCustomSite}
                  className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {sitesError && <p className="text-[var(--danger)] text-xs mt-2">{sitesError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Heure de début</label>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-2">Heure de fin</label>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

        <div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="tap-target bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Validation...' : "Valider l'engagement"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="tap-target border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-6 py-3 text-sm"
            >
              Annuler
            </button>
          </div>
          <p className="text-xs text-[var(--text-faint)] mt-3">
            La durée et la mise seront configurables dans une prochaine version.
          </p>
        </div>
      </form>
    </div>
  )
}
