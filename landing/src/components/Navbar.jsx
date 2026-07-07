const APP_URL = 'https://app.momentum-app.fr'

// Pas de liens de navigation internes — volontaire (voir directive) : chaque
// lien interne est une porte de sortie qui dilue la conversion. Un seul CTA.
export default function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 border-b-[0.5px] border-[var(--border)]"
      style={{
        background: 'rgba(6,6,8,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'navbar-slide-down 400ms ease-out both',
      }}
    >
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--accent)]" />
          <span className="text-white font-bold text-[13px] tracking-wide">MOMENTUM</span>
        </span>

        <a
          href={APP_URL}
          className="bg-[var(--accent)] text-[#052e1f] font-bold text-[12px] rounded-md px-4 py-2 transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-[0.97]"
        >
          Commencer gratuitement →
        </a>
      </div>
    </header>
  )
}
