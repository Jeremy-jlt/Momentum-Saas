import { useInView } from '../hooks/useInView'

const APP_URL = 'https://app.momentum-app.fr'

const FREE_FEATURES = [
  '5 habitudes actives',
  "2 templates d'habitudes",
  'Extension Chrome incluse',
  'Système de projets et sessions',
  'Mode hors ligne (PWA)',
  'Engagements illimités',
]

const PRO_FEATURES = [
  'Habitudes illimitées',
  '5 templates Pro (Builder, Athlète, Équilibre Mental...)',
  '4 layouts de dashboard',
  '8 types de graphiques',
  "Tracker d'humeur journalier",
  'Anneaux de progression hebdomadaires',
  'Statistiques avancées',
  '5 thèmes visuels',
  'Export CSV',
  'Rappels personnalisés',
  'Partage de progression',
]

export default function PricingSection() {
  const [ref, inView] = useInView()

  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div
        ref={ref}
        className="max-w-3xl mx-auto text-center"
        style={{
          opacity: inView ? 1 : 0,
          animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        }}
      >
        <p
          className="font-medium mb-4"
          style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Tarifs
        </p>
        <h2 className="text-white font-bold mb-12" style={{ fontSize: 28 }}>
          Simple. Transparent. Pas de surprise.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Gratuit */}
          <div className="rounded-2xl p-7" style={{ background: '#0d0d10', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
              GRATUIT
            </p>
            <p className="mb-1 mt-2">
              <span className="text-white font-extrabold" style={{ fontSize: 40 }}>
                0€
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}> /mois</span>
            </p>
            <ul className="flex flex-col gap-2.5 my-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: '#9ca3af' }}>
                  <span style={{ color: 'var(--accent)' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={APP_URL}
              className="block text-center rounded-lg font-bold transition-colors"
              style={{
                fontSize: 13,
                color: '#9ca3af',
                border: '1px solid #2a2a2a',
                padding: '13px 0',
                minHeight: 48,
              }}
            >
              Commencer gratuitement
            </a>
          </div>

          {/* Pro */}
          <div
            className="relative rounded-2xl p-7"
            style={{
              background: '#0d1210',
              border: '1px solid rgba(16,185,129,0.2)',
              boxShadow: '0 0 40px rgba(16,185,129,0.06)',
            }}
          >
            <span
              className="absolute top-4 right-4 text-[9px] font-bold rounded-full px-2.5 py-1"
              style={{ background: 'var(--accent)', color: '#052e1f' }}
            >
              RECOMMANDÉ
            </span>
            <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em' }}>
              DISCIPLINE+
            </p>
            <p className="mb-1 mt-2">
              <span className="font-extrabold" style={{ fontSize: 40, color: 'var(--accent)' }}>
                4,99€
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}> /mois</span>
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>ou 39€/an — économise 33%</p>
            <p style={{ fontSize: 11, color: 'var(--accent)' }} className="mt-1 mb-5">
              7 jours gratuits · Sans carte bancaire
            </p>
            <ul className="flex flex-col gap-2.5 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: '#9ca3af' }}>
                  <span style={{ color: 'var(--accent)' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={APP_URL}
              className="block text-center rounded-lg font-bold transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              style={{ fontSize: 13, background: 'var(--accent)', color: '#052e1f', padding: '13px 0', minHeight: 48 }}
            >
              Essayer 7 jours gratuits →
            </a>
          </div>
        </div>

        <p className="mt-10" style={{ fontSize: 10, color: 'var(--text-subtle)' }}>
          Paiement sécurisé. Annulation à tout moment. Données hébergées en Europe.
        </p>
      </div>
    </section>
  )
}
