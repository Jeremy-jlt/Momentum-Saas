import { useInView } from '../hooks/useInView'

const APP_URL = 'https://app.momentum-app.fr'

export default function FinalCtaSection() {
  const [ref, inView] = useInView()

  return (
    <section
      className="py-24 px-4 sm:px-6"
      style={{ background: 'linear-gradient(to bottom, var(--bg), #0a1a12)' }}
    >
      <div
        ref={ref}
        className="max-w-[600px] mx-auto text-center"
        style={{
          opacity: inView ? 1 : 0,
          animation: inView ? 'fade-slide-up 600ms ease-out both' : 'none',
        }}
      >
        <h2
          className="text-white font-extrabold mb-5"
          style={{ fontFamily: 'var(--font)', fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1.15 }}
        >
          Ta discipline.
          <br />
          Ton temps.
          <br />
          Ton avenir.
        </h2>
        <p className="mb-9" style={{ fontSize: 16, color: 'var(--text-muted)' }}>
          Rejoins ceux qui ont décidé que chaque jour compte.
        </p>

        <a
          href={APP_URL}
          className="inline-block bg-[var(--accent)] text-[#052e1f] font-bold rounded-lg transition-shadow duration-200 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]"
          style={{
            fontSize: 15,
            padding: '16px 40px',
            minHeight: 48,
            animation: 'cta-pulse 2s ease-in-out infinite',
          }}
        >
          Commencer maintenant — c'est gratuit →
        </a>

        <p className="mt-6" style={{ fontSize: 10, color: 'var(--text-subtle)' }}>
          Aucune carte bancaire requise · Annulation à tout moment · Données
          hébergées en Europe 🔒
        </p>
      </div>
    </section>
  )
}
