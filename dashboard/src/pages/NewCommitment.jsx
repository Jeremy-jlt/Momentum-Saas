import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { SITE_CATEGORIES } from '../data/siteCategories'

const DEFAULT_DUREE_JOURS = 14
const DEFAULT_MISE_EUROS = 10

export default function NewCommitment() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [nom, setNom] = useState('')
  const [selectedSites, setSelectedSites] = useState([])
  const [customSite, setCustomSite] = useState('')
  const [heureDebut, setHeureDebut] = useState('09:00')
  const [heureFin, setHeureFin] = useState('18:00')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)

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

    if (!nom.trim()) {
      setError('Donne un nom à ton engagement.')
      return
    }
    if (selectedSites.length === 0) {
      setError('Sélectionne au moins un site à bloquer.')
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
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Engagement créé</h1>
        <p className="text-gray-400 mb-8">« {created.nom} » est maintenant en cours.</p>

        <div className="text-left border border-gray-800 rounded-lg p-6 mb-8 text-sm space-y-2">
          <p>
            <span className="text-gray-500">Sites bloqués : </span>
            {created.sites_bloques.join(', ')}
          </p>
          <p>
            <span className="text-gray-500">Horaires : </span>
            {created.heure_debut} — {created.heure_fin}
          </p>
        </div>

        <button
          onClick={() => navigate('/engagements')}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
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
          <label className="block text-sm text-gray-300 mb-2">Nom de l'engagement</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Semaine de deep work"
            className="w-full bg-transparent border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-4">Sites à bloquer</label>
          <div className="flex flex-col gap-5">
            {SITE_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
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
                            ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                            : 'bg-transparent border-gray-700 text-gray-300 hover:border-gray-500'
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
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
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
                      className="text-xs rounded-full px-3 py-1.5 border bg-emerald-500 border-emerald-500 text-black font-bold"
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
                  className="flex-1 bg-transparent border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={addCustomSite}
                  className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Heure de début</label>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="w-full bg-transparent border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Heure de fin</label>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="w-full bg-transparent border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm disabled:opacity-50"
            >
              {submitting ? 'Validation...' : "Valider l'engagement"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-6 py-3 text-sm"
            >
              Annuler
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            La durée et la mise seront configurables dans une prochaine version.
          </p>
        </div>
      </form>
    </div>
  )
}
