import { Link } from 'react-router-dom'

const FREE_FEATURES = [
  "Jusqu'à 5 habitudes actives",
  '2 templates d\'habitudes',
  '1 layout (Focus)',
  'Graphique en courbe uniquement',
  'Engagements de blocage illimités',
  'Extension Chrome incluse',
  'Système de projets et sessions',
]

const PRO_FEATURES = [
  'Habitudes illimitées',
  '5 templates Pro (Builder, Athlète, Équilibre Mental...)',
  '4 layouts (Focus, Dashboard, Compact, Zen)',
  '4 types de graphiques',
  'Tracker d\'humeur journalier',
  'Anneaux hebdomadaires',
  'Statistiques avancées + breakdown par catégorie',
  'Objectifs mensuels par habitude',
  'Export CSV',
]

export default function Pricing() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-3">Tarifs</h1>
        <p className="text-[var(--text-faint)]">Commence gratuitement, passe à Pro quand tu es prêt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gratuit */}
        <div className="anim-fade-up card-hover bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-8 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">Pour commencer</h2>
            <span className="text-xs border border-[var(--border)] text-[var(--text-muted)] rounded-full px-3 py-1">
              Gratuit
            </span>
          </div>
          <p className="text-3xl font-bold mb-6">
            0€<span className="text-sm text-[var(--text-faint)] font-normal">/mois</span>
          </p>

          <ul className="flex flex-col gap-3 text-sm text-[var(--text-muted)] mb-8 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-[var(--accent)] shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/login"
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-3 text-sm text-center font-bold"
          >
            Commencer gratuitement →
          </Link>
        </div>

        {/* Discipline+ */}
        <div
          className="anim-fade-up card-hover bg-[var(--surface-2)] border border-[var(--accent)]/40 rounded-lg p-8 flex flex-col relative"
          style={{ '--d': '100ms' }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">Pour aller plus loin</h2>
            <span className="text-xs bg-[var(--accent)] text-[var(--accent-contrast)] font-bold rounded-full px-3 py-1">
              Pro
            </span>
          </div>
          <p className="text-3xl font-bold mb-1">
            4,99€<span className="text-sm text-[var(--text-faint)] font-normal">/mois</span>
          </p>
          <p className="text-xs text-[var(--text-faint)] mb-1">ou 39€/an — soit 3,25€/mois</p>
          <p className="text-xs text-[var(--accent)] mb-6">Bientôt disponible</p>

          <ul className="flex flex-col gap-3 text-sm text-[var(--text-muted)] mb-8 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-[var(--accent)] shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="bg-[var(--surface-3)] text-[var(--text-faint)] cursor-not-allowed rounded-md px-4 py-3 text-sm text-center font-bold"
          >
            Bientôt disponible
          </button>
        </div>
      </div>
    </div>
  )
}
