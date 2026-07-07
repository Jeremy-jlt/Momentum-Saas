import { useState } from 'react'
import { useInView } from '../hooks/useInView'

const FAQS = [
  {
    q: 'Est-ce que ça marche vraiment ?',
    a: "Momentum combine deux mécanismes prouvés : le blocage technique (pas de volonté requise — les sites sont physiquement inaccessibles) et le tracking de progression (ce qu'on mesure s'améliore). La combinaison des deux avec le système de projets est unique sur le marché.",
  },
  {
    q: 'Et si je triche sur mon tracker d\'habitudes ?',
    a: "Tu peux. Mais notre philosophie est simple : si tu trompes le système, tu gardes ton argent. Tu ne récupères jamais le temps perdu. Ce n'est pas Momentum que tu trompes. C'est toi-même.",
  },
  {
    q: "L'extension marche sur tous les navigateurs ?",
    a: "Momentum est optimisé pour Chrome et Edge (Chromium). La grande majorité des distractions web se passent dans le navigateur — c'est là qu'on agit.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Tes données sont chiffrées, hébergées en Europe (Supabase EU West), et tu peux les exporter ou les supprimer à tout moment. Nous ne vendons jamais tes données.',
  },
  {
    q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Annulation en un clic, sans friction, sans mail de rétention agressif. Tes données restent accessibles en version gratuite.',
  },
]

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span
          className="font-medium text-[14px] transition-colors"
          style={{ color: isOpen ? 'var(--accent)' : 'white' }}
        >
          {item.q}
        </span>
        <span
          className="shrink-0 text-lg font-light transition-transform duration-200"
          style={{ color: isOpen ? 'var(--accent)' : 'var(--text-muted)', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          +
        </span>
      </button>
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[13px] leading-relaxed" style={{ color: '#9ca3af' }}>
            {item.a}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const [ref, inView] = useInView()

  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div
        ref={ref}
        className="max-w-[640px] mx-auto"
        style={{
          opacity: inView ? 1 : 0,
          animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        }}
      >
        <p
          className="font-medium mb-4"
          style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Questions fréquentes
        </p>
        <h2 className="text-white font-bold mb-8" style={{ fontSize: 28 }}>
          Tout ce que tu veux savoir.
        </h2>

        <div>
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
