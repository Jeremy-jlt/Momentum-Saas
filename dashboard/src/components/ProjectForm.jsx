import { useState } from 'react'
import { PROJECT_COLORS } from '../data/projectOptions'

const DEFAULT_TEMPS_MINIMUM = 30

export default function ProjectForm({ initial, habitudes, onSubmit, onCancel, submitLabel }) {
  const [nom, setNom] = useState(initial?.nom || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [couleur, setCouleur] = useState(initial?.couleur || PROJECT_COLORS[0])
  const [habitudeId, setHabitudeId] = useState(initial?.habitude_id || '')
  const [tempsMinimum, setTempsMinimum] = useState(
    initial?.temps_minimum_minutes || DEFAULT_TEMPS_MINIMUM
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!nom.trim()) {
      setError('Donne un nom à ton projet.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        nom: nom.trim(),
        description: description.trim() || null,
        couleur,
        habitude_id: habitudeId || null,
        temps_minimum_minutes: habitudeId ? tempsMinimum : DEFAULT_TEMPS_MINIMUM,
      })
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    }
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">Nom du projet</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Thèse de doctorat"
          className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">Description (optionnel)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Courte description"
          className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">Couleur</label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCouleur(c)}
              className={`w-7 h-7 rounded-full border-2 transition-colors ${
                couleur === c ? 'border-[var(--text-strong)]' : 'border-transparent'
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-[var(--text-muted)] mb-2">Habitude liée (optionnel)</label>
        <select
          value={habitudeId}
          onChange={(e) => setHabitudeId(e.target.value)}
          className="w-full bg-transparent border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-muted)]"
        >
          <option value="" className="bg-[var(--surface-0)]">
            Aucune
          </option>
          {habitudes.map((h) => (
            <option key={h.id} value={h.id} className="bg-[var(--surface-0)]">
              {h.emoji} {h.nom}
            </option>
          ))}
        </select>
      </div>

      {habitudeId && (
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-2">
            Temps minimum pour cocher l'habitude :{' '}
            <span className="text-[var(--text-strong)] font-bold">{tempsMinimum} min</span>
          </label>
          <input
            type="range"
            min={5}
            max={120}
            step={5}
            value={tempsMinimum}
            onChange={(e) => setTempsMinimum(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-[var(--text-faint)] mt-1 mb-2">
            <span>5 min</span>
            <span>120 min</span>
          </div>
          <p className="text-xs text-[var(--text-faint)]">
            La coche sera créée automatiquement si tu travailles au moins{' '}
            {tempsMinimum} minutes sur ce projet.
          </p>
        </div>
      )}

      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      <div className="flex items-center gap-3 justify-end mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </div>
  )
}
