import { useInView } from '../hooks/useInView'

const APP_URL = 'https://app.momentum-app.fr'

const STEPS = [
  {
    number: '01',
    title: 'Crée ton compte',
    text: 'Gratuit, sans carte bancaire. 30 secondes pour s\'inscrire.',
  },
  {
    number: '02',
    title: "Installe l'extension",
    text: 'Chrome Web Store. Un clic. Elle bloque tes sites pendant tes sessions.',
  },
  {
    number: '03',
    title: 'Choisis tes habitudes',
    text: 'Templates prêts à l\'emploi ou crée les tiennes. Adapté à ton profil.',
  },
  {
    number: '04',
    title: 'Commence maintenant',
    text: 'Lance ta première session. Vois ta progression en temps réel.',
  },
]

function StepCard({ step, index }) {
  const [ref, inView] = useInView({ threshold: 0.25 })
  return (
    <div
      ref={ref}
      className="relative flex-1"
      style={{
        opacity: inView ? 1 : 0,
        animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        animationDelay: `${index * 120}ms`,
      }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-[13px] mb-4"
        style={{ border: '1.5px solid var(--accent)', color: 'var(--accent)' }}
      >
        {step.number}
      </span>
      <h3 className="text-white font-bold text-[15px] mb-1.5">{step.title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: '#9ca3af' }}>
        {step.text}
      </p>
    </div>
  )
}

export default function HowItWorksSection() {
  const [headerRef, headerInView] = useInView()
  const [lineRef, lineInView] = useInView({ threshold: 0.3 })

  return (
    <section id="comment-ca-marche" className="py-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className="mb-14"
          style={{
            opacity: headerInView ? 1 : 0,
            animation: headerInView ? 'fade-slide-up 500ms ease-out both' : 'none',
          }}
        >
          <p
            className="font-medium mb-4"
            style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Comment ça marche ?
          </p>
          <h2 className="text-white font-bold" style={{ fontSize: 28 }}>
            En place en 3 minutes.
          </h2>
        </div>

        <div ref={lineRef} className="relative flex flex-col md:flex-row gap-10 md:gap-6 mb-14">
          <div
            className="hidden md:block absolute top-5 left-0 right-0 h-0 origin-left"
            style={{
              borderTop: '2px dashed rgba(16,185,129,0.3)',
              transform: lineInView ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 900ms ease-out',
            }}
          />
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>

        <div className="text-center">
          <a
            href={APP_URL}
            className="inline-block bg-[var(--accent)] text-[#052e1f] font-bold rounded-lg transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:scale-[0.97]"
            style={{ fontSize: 14, padding: '14px 32px', minHeight: 48 }}
          >
            Prêt ? C'est gratuit →
          </a>
        </div>
      </div>
    </section>
  )
}
