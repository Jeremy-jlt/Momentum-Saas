export default function Footer() {
  return (
    <footer style={{ background: '#040407', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
        <div>
          <span className="flex items-center gap-2 justify-center md:justify-start mb-1">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
            <span className="text-white font-bold text-[12px] tracking-wide">MOMENTUM</span>
          </span>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
            Chaque jour compte. Chaque distraction coûte.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2" style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
          <a href="/mentions-legales" className="hover:text-[var(--text-muted)] transition-colors">
            Mentions légales
          </a>
          <span>·</span>
          <a href="/cgu" className="hover:text-[var(--text-muted)] transition-colors">
            CGU
          </a>
          <span>·</span>
          <a href="mailto:contact@momentum-app.fr" className="hover:text-[var(--text-muted)] transition-colors">
            Contact
          </a>
        </div>

        <p className="md:text-right" style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
          © 2026 Momentum · Fait pour ceux qui refusent de perdre leur temps
        </p>
      </div>
    </footer>
  )
}
