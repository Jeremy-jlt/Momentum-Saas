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
        <p className="text-gray-400">Commence gratuitement, passe à Pro quand tu es prêt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gratuit */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-8 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">Pour commencer</h2>
            <span className="text-xs border border-gray-700 text-gray-300 rounded-full px-3 py-1">
              Gratuit
            </span>
          </div>
          <p className="text-3xl font-bold mb-6">
            0€<span className="text-sm text-gray-500 font-normal">/mois</span>
          </p>

          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/login"
            className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-3 text-sm text-center font-bold"
          >
            Commencer gratuitement →
          </Link>
        </div>

        {/* Discipline+ */}
        <div className="bg-[#141414] border border-emerald-500/40 rounded-lg p-8 flex flex-col relative">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">Pour aller plus loin</h2>
            <span className="text-xs bg-emerald-500 text-black font-bold rounded-full px-3 py-1">
              Pro
            </span>
          </div>
          <p className="text-3xl font-bold mb-1">
            4,99€<span className="text-sm text-gray-500 font-normal">/mois</span>
          </p>
          <p className="text-xs text-gray-500 mb-1">ou 39€/an — soit 3,25€/mois</p>
          <p className="text-xs text-emerald-400 mb-6">Bientôt disponible</p>

          <ul className="flex flex-col gap-3 text-sm text-gray-300 mb-8 flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            disabled
            className="bg-gray-800 text-gray-500 cursor-not-allowed rounded-md px-4 py-3 text-sm text-center font-bold"
          >
            Bientôt disponible
          </button>
        </div>
      </div>
    </div>
  )
}
