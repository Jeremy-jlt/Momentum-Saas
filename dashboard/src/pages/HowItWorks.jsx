import { Link } from 'react-router-dom'

const STEPS = [
  {
    title: 'Tu définis ton engagement',
    text: 'Quels sites bloquer sur ton PC, pendant combien de temps, avec quelle mise symbolique.',
  },
  {
    title: "L'extension bloque techniquement les sites",
    text: "L'extension Chrome bloque ces sites dans ton navigateur pendant les horaires choisis.",
  },
  {
    title: 'Tu importes ta preuve mobile',
    text: 'À la fin, importe ta capture d\'écran "Temps d\'écran" (iOS) ou "Bien-être numérique" (Android) pour vérifier ton engagement mobile.',
  },
  {
    title: 'Tu récupères ta mise, ou tu la perds',
    text: 'Si tu tiens ton engagement, tu récupères ta mise. Sinon, elle est perdue.',
  },
]

export default function HowItWorks() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-12">Comment ça marche ?</h1>

      <div className="flex flex-col gap-8 mb-12">
        {STEPS.map((step, i) => (
          <div key={step.title} className="anim-fade-up flex gap-5" style={{ '--d': `${i * 90}ms` }}>
            <div className="shrink-0 w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-sm font-bold text-[var(--text-muted)]">
              {i + 1}
            </div>
            <div>
              <h2 className="font-bold mb-1">{step.title}</h2>
              <p className="text-[var(--text-faint)] text-sm">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-l-2 border-[var(--accent)] pl-5 py-2 mb-12">
        <p className="text-[var(--text-muted)]">
          Tu peux tromper Momentum. Tu ne peux pas tromper le temps perdu.
        </p>
      </div>

      <Link
        to="/new"
        className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm inline-block"
      >
        Créer mon premier engagement
      </Link>
    </div>
  )
}
