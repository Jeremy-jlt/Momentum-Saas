import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { useCountUp } from '../hooks/useCountUp'

const HERO_TITLE = 'Momentum'

const SOCIAL_PROOF = [
  { value: 298, suffix: 'M', label: 'utilisateurs globaux trackent leurs habitudes' },
  { value: 67, suffix: '%', label: 'des apps qui retiennent leurs utilisateurs utilisent les streaks' },
  { value: 22, suffix: '%', label: "d'amélioration de l'adhérence avec des recommandations IA" },
  { value: 15, suffix: '%', label: 'de croissance annuelle du marché' },
]

// Témoignages d'exemple — à remplacer par de vrais retours utilisateurs
// avant mise en production. Format conservé (avatar/nom/rôle/citation/note)
// pour un remplacement direct.
const TESTIMONIALS = [
  {
    name: 'Léa M.',
    role: 'Freelance design',
    quote: "Le lien entre bloquer mes distractions et cocher mon habitude, c'est ce qui manquait à toutes les autres apps.",
    initials: 'LM',
    color: '#10b981',
  },
  {
    name: 'Thomas R.',
    role: 'Étudiant en médecine',
    quote: "23 jours de streak et je n'ai jamais tenu aussi longtemps sur une routine de révision.",
    initials: 'TR',
    color: '#60a5fa',
  },
  {
    name: 'Sarah K.',
    role: 'Développeuse',
    quote: 'Le mode Zen pendant mes sessions de deep work a changé ma productivité du jour au lendemain.',
    initials: 'SK',
    color: '#f97316',
  },
  {
    name: 'Nicolas B.',
    role: 'Entrepreneur',
    quote: "Simple, honnête, sans notifications culpabilisantes. Exactement ce que je cherchais.",
    initials: 'NB',
    color: '#a78bfa',
  },
]

const PRICING_TEASER = [
  {
    name: 'Pour commencer',
    price: '0€',
    tag: 'Gratuit',
    features: ["Jusqu'à 5 habitudes actives", '1 layout (Focus)', 'Engagements illimités'],
  },
  {
    name: 'Pour aller plus loin',
    price: '4,99€',
    tag: 'Pro',
    highlight: true,
    features: ['Habitudes illimitées', '4 layouts + 4 graphiques', 'Statistiques avancées'],
  },
]

function useInView(threshold = 0.4) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

function CountUpValue({ value, suffix = '' }) {
  const animated = useCountUp(value, 1200)
  return (
    <>
      {Math.round(animated)}
      {suffix}
    </>
  )
}

function AnimatedMetric({ value, suffix, label }) {
  const [ref, inView] = useInView(0.4)
  return (
    <div ref={ref} className="text-center">
      <p className="num text-[40px] font-bold text-[var(--accent)] leading-none mb-2">
        {inView ? <CountUpValue value={value} suffix={suffix} /> : `0${suffix}`}
      </p>
      <p className="text-[12px] text-[var(--text-faint)] leading-snug">{label}</p>
    </div>
  )
}

function BentoFlow() {
  const [ref, inView] = useInView(0.3)
  return (
    <div ref={ref} className="flex items-center justify-center gap-2 my-6">
      <span className="text-2xl">🚫</span>
      <span
        className={`h-[1.5px] w-10 bg-[var(--accent)] origin-left transition-transform duration-700 ${
          inView ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
      <span className="text-2xl">🎯</span>
      <span
        className={`h-[1.5px] w-10 bg-[var(--accent)] origin-left transition-transform duration-700 delay-300 ${
          inView ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
      <span className="text-2xl">✅</span>
    </div>
  )
}

function LandingView() {
  return (
    <>
      {/* HERO */}
      <div className="min-h-[100vh] flex flex-col items-center justify-center relative">
        <div className="w-full max-w-3xl mx-auto px-6 text-center">
          <p className="anim-fade-up kicker mb-5" style={{ color: 'var(--accent)' }}>
            Reprends le contrôle
          </p>

          <h1
            className="font-bold tracking-tight mb-5 text-[var(--text-strong)]"
            style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(52px, 8vw, 96px)', letterSpacing: '-0.04em' }}
          >
            {HERO_TITLE.split('').map((letter, i) => (
              <span
                key={i}
                className="inline-block animate-[letter-drop_500ms_ease-out_both]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {letter}
              </span>
            ))}
          </h1>

          <div className="mb-6">
            <p className="anim-fade-up text-xl text-[var(--text-strong)]" style={{ '--d': '400ms' }}>
              Chaque jour compte.
            </p>
            <p
              className="anim-fade-up text-xl font-bold"
              style={{ '--d': '600ms', color: 'var(--accent)', marginLeft: 24 }}
            >
              Chaque distraction coûte.
            </p>
          </div>

          <p
            className="anim-fade-up text-[12px] text-[var(--text-faint)] max-w-sm mx-auto mb-10 leading-relaxed"
            style={{ '--d': '750ms' }}
          >
            49% des gens abandonnent leur app de productivité en 60 jours. Les
            autres ont un système. Voici le leur.
          </p>

          <div className="anim-fade-up flex items-center justify-center gap-4" style={{ '--d': '850ms' }}>
            <Link
              to="/login"
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-[background-color,transform,box-shadow] text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
            >
              Créer un engagement
            </Link>
            <Link
              to="/how-it-works"
              className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-[border-color,transform] rounded-md px-6 py-3 text-sm"
            >
              Comment ça marche ?
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <span className="block w-[1px] h-10 bg-[var(--border-strong)] animate-[scroll-cue-pulse_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* PREUVE SOCIALE */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {SOCIAL_PROOF.map((m) => (
            <AnimatedMetric key={m.label} value={m.value} suffix={m.suffix} label={m.label} />
          ))}
        </div>
      </div>

      {/* LE SYSTÈME MOMENTUM */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-heading text-center mb-10">Le système Momentum</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 card-hover card-glass border border-[var(--border)] rounded-lg p-8">
            <h3 className="text-section mb-2">Bloquer. Travailler. Progresser.</h3>
            <p className="text-body mb-2">
              Chaque session de travail bloquée alimente automatiquement tes habitudes.
            </p>
            <BentoFlow />
          </div>
          <div className="card-hover card-glass border border-[var(--border)] rounded-lg p-8">
            <p className="text-2xl mb-3">📡🔒</p>
            <h3 className="text-section mb-2">Hors ligne. Toujours avec toi.</h3>
            <p className="text-body">Tes données t'appartiennent. Elles fonctionnent même sans connexion.</p>
          </div>

          <div className="card-hover card-glass border border-[var(--border)] rounded-lg p-6 flex flex-col justify-center">
            <p className="text-2xl font-bold text-[var(--accent)] mb-1">🔥 23 jours</p>
            <p className="text-[11px] text-[var(--text-faint)]">Streak moyen des utilisateurs actifs</p>
          </div>
          <div className="card-hover card-glass border border-[var(--border)] rounded-lg p-6">
            <h3 className="text-section mb-2">Projets liés à tes habitudes</h3>
            <p className="text-body">Chaque minute de travail contribue à ta progression. Automatiquement.</p>
          </div>
          <Link
            to="/login"
            className="card-hover card-glass border border-[var(--border)] rounded-lg p-6 flex items-center justify-between group"
          >
            <span className="text-section">Essaie gratuitement</span>
            <span className="text-[var(--accent)] transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* TÉMOIGNAGES */}
      <div className="py-20">
        <h2 className="text-heading text-center mb-10 px-6">Ils ont repris le contrôle</h2>
        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory px-6 pb-4 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="snap-start shrink-0 w-[280px] card-glass border border-[var(--border)] rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--text-strong)]">{t.name}</p>
                  <p className="text-[11px] text-[var(--text-faint)]">{t.role}</p>
                </div>
              </div>
              <p className="text-[var(--accent)] text-xs mb-3">★★★★★</p>
              <p className="text-body">{t.quote}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING CONDENSÉ */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-heading text-center mb-10">Tarifs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PRICING_TEASER.map((p) => (
            <div
              key={p.name}
              className={`card-hover card-glass border rounded-lg p-6 ${
                p.highlight ? 'border-[var(--accent)]/40' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold">{p.name}</h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] rounded-[4px] px-2 py-1 ${
                    p.highlight
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'border border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {p.tag}
                </span>
              </div>
              <p className="num text-2xl font-bold mb-4">
                {p.price}
                <span className="text-xs text-[var(--text-faint)] font-normal">/mois</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-[var(--text-muted)] mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[var(--accent)] shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/pricing"
                className="block text-center text-sm font-bold border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2.5"
              >
                Voir le détail →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function ReturningUserView({ ongoingCount }) {
  return (
    <div className="min-h-[calc(100dvh-6rem)] flex items-center">
      <div className="w-full max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="anim-fade-up kicker mb-4" style={{ color: 'var(--accent)' }}>
          Reprends le contrôle
        </p>
        <h1
          className="anim-fade-up text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-[var(--text-strong)]"
          style={{ '--d': '80ms' }}
        >
          Momentum
        </h1>
        <p className="anim-fade-up text-lg text-[var(--text-muted)] mb-6 text-balance" style={{ '--d': '100ms' }}>
          Chaque jour compte. Chaque distraction coûte.
        </p>
        <p
          className="anim-fade-up text-[var(--text-faint)] max-w-xl mx-auto mb-10 text-balance"
          style={{ '--d': '200ms' }}
        >
          Bloque les sites qui te distraient pendant tes sessions de travail sur
          ordinateur. Crée un engagement avec une mise symbolique, tiens ta
          promesse, et reprends le contrôle de tes heures de concentration.
        </p>

        <div className="anim-fade-up flex items-center justify-center gap-4 mb-10" style={{ '--d': '300ms' }}>
          <Link
            to="/new"
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-[background-color,transform] text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
          >
            Créer un engagement
          </Link>
          <Link
            to="/how-it-works"
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-[border-color,transform] rounded-md px-6 py-3 text-sm"
          >
            Comment ça marche ?
          </Link>
        </div>

        {ongoingCount > 0 && (
          <p className="anim-fade-up text-sm text-[var(--text-faint)]" style={{ '--d': '400ms' }}>
            Tu as {ongoingCount} engagement{ongoingCount > 1 ? 's' : ''} en cours.{' '}
            <Link to="/engagements" className="text-[var(--accent)] hover:underline">
              Voir mes engagements
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [ongoingCount, setOngoingCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setOngoingCount(0)
      return
    }

    let cancelled = false

    supabase
      .from('engagements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('statut', 'en_cours')
      .then(({ count }) => {
        if (!cancelled) setOngoingCount(count ?? 0)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  // Le fond animé est global (BeamsBackground fixe dans Layout) — les deux
  // vues n'ont plus qu'à poser leur contenu par-dessus.
  if (!user) return <LandingView />

  return <ReturningUserView ongoingCount={ongoingCount} />
}
