import BeamsBackground from './BeamsBackground'

const APP_URL = 'https://app.momentum-app.fr'

const LINE_1 = ['Arrête', 'de', 'te', 'distraire.']
const LINE_2 = ['Commence', 'à', 'construire.']

function AnimatedLine({ words, startIndex }) {
  return (
    <>
      {words.map((word, i) => (
        <span
          key={word}
          className="inline-block mr-[0.28em]"
          style={{
            animation: `word-drop 500ms ease-out both`,
            animationDelay: `${200 + (startIndex + i) * 60}ms`,
          }}
        >
          {word}
        </span>
      ))}
    </>
  )
}

export default function Hero() {
  const scrollToHowItWorks = (e) => {
    e.preventDefault()
    document.getElementById('comment-ca-marche')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--bg)]">
      <BeamsBackground intensity="subtle" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center py-32">
        <span
          className="inline-block mb-6 text-[11px] font-medium rounded-full px-[14px] py-1"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '0.5px solid rgba(16,185,129,0.3)',
            color: 'var(--accent)',
            animation: 'fade-slide-up 600ms ease-out both',
          }}
        >
          🔒 Aucune distraction. Zéro excuse.
        </span>

        <h1
          className="font-extrabold text-white mb-6"
          style={{
            fontFamily: 'var(--font)',
            fontWeight: 800,
            fontSize: 'clamp(40px, 7vw, 88px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
          }}
        >
          <div>
            <AnimatedLine words={LINE_1} startIndex={0} />
          </div>
          <div>
            <AnimatedLine words={LINE_2} startIndex={LINE_1.length} />
          </div>
        </h1>

        <p
          className="mx-auto mb-5"
          style={{
            fontSize: 'clamp(15px, 2vw, 19px)',
            color: '#9ca3af',
            maxWidth: 520,
            lineHeight: 1.6,
            animation: 'fade-in 500ms ease-out both',
            animationDelay: '800ms',
          }}
        >
          L'app qui bloque tes distractions, track tes habitudes et mesure ce
          que tu construis vraiment avec ton temps.
        </p>

        <p
          className="italic mb-9"
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            animation: 'fade-in 500ms ease-out both',
            animationDelay: '1000ms',
          }}
        >
          Rejoint par des milliers de personnes qui ont choisi la discipline.
        </p>

        <div
          style={{
            animation: 'cta-pop 500ms ease-out both',
            animationDelay: '1100ms',
          }}
        >
          <a
            href={APP_URL}
            className="inline-block bg-[var(--accent)] text-[#052e1f] font-bold rounded-lg transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:scale-[0.97]"
            style={{ fontSize: 14, padding: '14px 32px', minHeight: 48 }}
          >
            Commencer gratuitement — sans carte bancaire
          </a>
        </div>

        <div
          className="mt-5"
          style={{ animation: 'fade-in 500ms ease-out both', animationDelay: '1200ms' }}
        >
          <a
            href="#comment-ca-marche"
            onClick={scrollToHowItWorks}
            className="text-[12px] font-medium hover:text-[var(--text-muted)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Voir comment ça marche ↓
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <span
          className="block w-[1px] h-10"
          style={{
            background: 'var(--accent)',
            animation: 'scroll-line-pulse 2s ease-in-out infinite',
          }}
        />
      </div>
    </section>
  )
}
