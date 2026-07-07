import { useInView } from '../hooks/useInView'

function BentoCard({ areaClass, children, index }) {
  const [ref, inView] = useInView({ threshold: 0.15 })
  return (
    <div
      ref={ref}
      className={`rounded-2xl p-6 transition-[border-color,transform] duration-250 hover:-translate-y-[3px] group ${areaClass}`}
      style={{
        background: '#0d0d12',
        border: '0.5px solid rgba(255,255,255,0.06)',
        opacity: inView ? 1 : 0,
        animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        animationDelay: `${index * 100}ms`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      {children}
    </div>
  )
}

function StepFlow() {
  const [ref, inView] = useInView({ threshold: 0.3 })
  const steps = [
    '🚫 Extension Chrome bloque les sites distrayants',
    '⚡ Tu déclares ta tâche et ton projet',
    "✓ L'habitude se coche automatiquement",
  ]

  return (
    <div ref={ref}>
      <h3 className="text-white font-bold text-[18px] mb-5">Bloque → Travaille → Progresse</h3>
      <div className="relative flex flex-col gap-4">
        <div
          className="absolute left-[11px] top-2 bottom-2 w-[1.5px] origin-top"
          style={{
            background: 'var(--accent)',
            transform: inView ? 'scaleY(1)' : 'scaleY(0)',
            transition: 'transform 1000ms ease-out',
          }}
        />
        {steps.map((step, i) => (
          <div key={step} className="relative flex items-center gap-4 pl-8">
            <span
              className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--bg-2)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
            >
              {i + 1}
            </span>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitGridIcon() {
  const cells = [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1]
  return (
    <div className="grid grid-cols-4 gap-1 mb-4 w-fit">
      {cells.map((filled, i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-[2px]"
          style={{ background: filled ? 'var(--accent)' : '#242429' }}
        />
      ))}
    </div>
  )
}

export default function SolutionSection() {
  const [headerRef, headerInView] = useInView()

  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: '#080810' }}>
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className="mb-10"
          style={{
            opacity: headerInView ? 1 : 0,
            animation: headerInView ? 'fade-slide-up 500ms ease-out both' : 'none',
          }}
        >
          <p
            className="font-medium mb-4"
            style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            La solution
          </p>
          <h2 className="text-white font-bold mb-3" style={{ fontSize: 28 }}>
            Un système complet. Pas une app de plus.
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 480 }}>
            Momentum est la première app qui connecte le blocage de tes
            distractions, le suivi de tes habitudes, et la mesure de ce que tu
            construis réellement avec ton temps.
          </p>
        </div>

        <div>
          <div className="bento-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            <BentoCard areaClass="bento-a" index={0}>
              <StepFlow />
            </BentoCard>
            <BentoCard areaClass="bento-b" index={1}>
              <HabitGridIcon />
              <h3 className="text-white font-bold text-[16px] mb-1">Tes habitudes. Visuellement.</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                Grille mensuelle, streaks, 8 types de graphiques, 5 thèmes
                visuels. Chaque jour mesuré.
              </p>
            </BentoCard>
            <BentoCard areaClass="bento-c" index={2}>
              <p className="text-2xl mb-3">📡🔒</p>
              <h3 className="text-white font-bold text-[16px] mb-1">Fonctionne sans connexion</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                PWA installable. Tes données synchronisées au retour en ligne.
              </p>
            </BentoCard>
            <BentoCard areaClass="bento-d" index={3}>
              <p className="text-2xl mb-3">🧩</p>
              <h3 className="text-white font-bold text-[16px] mb-1">Bloque vraiment. Pas juste sur mobile.</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>
                YouTube, Instagram, TikTok — bloqués pendant tes sessions de
                travail.
              </p>
            </BentoCard>
          </div>
        </div>
      </div>
    </section>
  )
}
