import { useInView } from '../hooks/useInView'

const PAIN_POINTS = [
  "Tu ouvres Instagram «juste 5 minutes». 45 minutes plus tard, tu culpabilises.",
  'Tu lances des objectifs le 1er janvier. Tu les oublies le 15.',
  'Tu regardes Netflix au lieu de travailler sur ton projet. Encore.',
]

const APP_ICONS = [
  { color: '#e1306c', top: '18%', left: '20%', delay: '0ms' },
  { color: '#25f4ee', top: '30%', left: '58%', delay: '150ms' },
  { color: '#ff0000', top: '52%', left: '32%', delay: '300ms' },
  { color: '#e1306c', top: '65%', left: '62%', delay: '450ms' },
]

function PhoneVisual() {
  return (
    <div className="relative w-[220px] h-[420px] mx-auto">
      <div
        className="absolute inset-0 rounded-[32px] overflow-hidden"
        style={{ border: '3px solid #1a1a20', background: '#0a0a0d' }}
      >
        <div className="absolute inset-0">
          {APP_ICONS.map((icon, i) => (
            <span
              key={i}
              className="absolute w-10 h-10 rounded-xl"
              style={{
                background: icon.color,
                top: icon.top,
                left: icon.left,
                animation: 'icon-cycle 5s ease-in-out infinite',
                animationDelay: icon.delay,
              }}
            />
          ))}

          <div
            className="absolute inset-0 origin-left"
            style={{
              background: 'var(--accent)',
              animation: 'block-cycle 5s ease-in-out infinite',
            }}
          />

          <div
            className="absolute inset-0 flex items-center justify-center px-4 text-center"
            style={{ animation: 'label-cycle 5s ease-in-out infinite' }}
          >
            <span className="text-[#052e1f] font-extrabold text-[13px] tracking-wide">
              BLOQUÉ PAR MOMENTUM
            </span>
          </div>
        </div>
      </div>
      {/* Encoche du téléphone */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 rounded-b-lg bg-[#1a1a20]" />
    </div>
  )
}

export default function ProblemSection() {
  const [ref, inView] = useInView()

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div
        className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        style={{
          opacity: inView ? 1 : 0,
          animation: inView ? 'fade-slide-up 600ms ease-out both' : 'none',
        }}
      >
        <div>
          <p
            className="font-medium mb-4"
            style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Le problème
          </p>
          <h2
            className="text-white font-bold mb-8"
            style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.3 }}
          >
            Tu sais ce que tu veux faire.
            <br />
            La distraction t'en empêche.
          </h2>

          <div className="flex flex-col gap-4">
            {PAIN_POINTS.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 pl-1"
                style={{ borderLeft: '2px solid rgba(127,29,29,0.2)', paddingLeft: 16 }}
              >
                <span style={{ color: '#7f1d1d', fontSize: 14, lineHeight: 1.5 }}>✗</span>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>{point}</p>
              </div>
            ))}
          </div>
        </div>

        <PhoneVisual />
      </div>
    </section>
  )
}
