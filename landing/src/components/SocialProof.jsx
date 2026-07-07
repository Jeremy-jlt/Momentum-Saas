import { useInView } from '../hooks/useInView'

const TESTIMONIALS = [
  {
    initials: 'TM',
    avatarBg: '#1a2e1a',
    name: 'Thomas M.',
    role: 'Étudiant en médecine',
    quote:
      "Avant Momentum, je passais 3h sur Instagram pendant mes révisions. Maintenant mes sessions de blocage sont liées à mon projet 'Concours' et mes habitudes se cochent automatiquement. Mon streak est à 47 jours.",
  },
  {
    initials: 'LR',
    avatarBg: '#1a1a2e',
    name: 'Léa R.',
    role: 'Développeuse freelance',
    quote:
      "Le lien entre l'extension qui bloque les sites et mes projets dans le tracker — c'est ce qui manquait à toutes les autres apps. Je vois enfin ce que je construis avec mon temps.",
  },
  {
    initials: 'MC',
    avatarBg: '#2e1a1a',
    name: 'Marc C.',
    role: 'Entrepreneur',
    quote:
      "J'ai essayé Beeminder, Forest, Opal. Momentum est la seule app que j'utilise encore après 3 mois. Parce qu'elle me montre ma progression, pas juste mes échecs.",
  },
]

function TestimonialCard({ t, index }) {
  const [ref, inView] = useInView({ threshold: 0.2 })

  return (
    <div
      ref={ref}
      className="rounded-[14px] p-5"
      style={{
        background: 'var(--bg-2)',
        border: '0.5px solid var(--border)',
        opacity: inView ? 1 : 0,
        animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{ background: t.avatarBg, color: 'var(--accent)' }}
        >
          {t.initials}
        </span>
        <div>
          <p className="text-white font-semibold text-[13px]">{t.name}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t.role}
          </p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: '#9ca3af' }}>
        {t.quote}
      </p>
      <p style={{ color: 'var(--accent)', fontSize: 13 }}>★★★★★</p>
    </div>
  )
}

export default function SocialProof() {
  return (
    <section className="py-12 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">
        <p
          className="text-center mb-8 font-semibold"
          style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Ils ont repris le contrôle de leur temps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
