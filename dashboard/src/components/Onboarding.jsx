import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

const ONBOARDING_STORAGE_KEY = 'momentum_onboarding_done'

const STEPS = [
  {
    title: 'Bienvenue sur Momentum 👋',
    text: "Momentum combine un bloqueur de distractions, un tracker d'habitudes et un système de projets pour t'aider à reprendre le contrôle de ton temps.",
    primary: { label: 'Commencer →', action: 'next' },
  },
  {
    title: 'Choisis tes habitudes',
    text: "Commence par choisir un template d'habitudes adapté à ton profil.",
    primary: { label: 'Choisir un template →', action: 'navigate', to: '/habits/templates' },
    skip: 'Passer cette étape',
  },
  {
    title: "Installe l'extension Chrome",
    text: "L'extension Chrome bloque les sites distrayants pendant tes sessions de travail.",
    extraLink: { label: 'Bientôt sur le Chrome Web Store', href: '#' },
    primary: { label: 'Continuer →', action: 'next' },
    skip: "J'ai déjà l'extension",
  },
  {
    title: 'Crée ton premier engagement',
    text: "Un engagement, c'est un contrat avec toi-même : tu bloques tes distractions pendant une période définie avec une mise symbolique.",
    primary: { label: 'Créer mon premier engagement →', action: 'navigate', to: '/new' },
    skip: 'Plus tard',
  },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') return

    let cancelled = false

    async function checkNewUser() {
      const [habitudesRes, engagementsRes] = await Promise.all([
        supabase
          .from('habitudes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('engagements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (cancelled) return

      const hasHabitudes = (habitudesRes.count || 0) > 0
      const hasEngagements = (engagementsRes.count || 0) > 0

      if (!hasHabitudes && !hasEngagements) {
        setVisible(true)
      } else {
        // Compte déjà actif (créé avant cette fonctionnalité, par exemple) —
        // on ne lui imposera pas l'onboarding.
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      }
    }

    checkNewUser()
    return () => {
      cancelled = true
    }
  }, [user])

  const markDone = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setVisible(false)
  }

  const isLastStep = stepIndex === STEPS.length - 1

  const handlePrimary = (step) => {
    if (step.primary.action === 'navigate') {
      markDone()
      navigate(step.primary.to)
      return
    }
    if (isLastStep) {
      markDone()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  const handleSkip = () => {
    if (isLastStep) {
      markDone()
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  if (!visible) return null

  const step = STEPS[stepIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/70" />
      <div className="relative bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
        <p className="text-[var(--text-faint)] text-sm mb-6">{step.text}</p>

        {step.extraLink && (
          <a
            href={step.extraLink.href}
            className="inline-block text-xs border border-[var(--border)] text-[var(--text-faint)] rounded-full px-3 py-1.5 mb-6 hover:border-[var(--border-strong)] transition-colors"
          >
            {step.extraLink.label}
          </a>
        )}

        <button
          onClick={() => handlePrimary(step)}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-4 py-3 text-sm mb-3"
        >
          {step.primary.label}
        </button>

        <div className="flex items-center justify-between">
          {stepIndex > 0 ? (
            <button
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
            >
              ← Précédent
            </button>
          ) : (
            <span />
          )}

          {step.skip && (
            <button
              onClick={handleSkip}
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors underline"
            >
              {step.skip}
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === stepIndex ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
