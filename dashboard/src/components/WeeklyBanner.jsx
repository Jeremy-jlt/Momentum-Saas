import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { getCached } from '../utils/dataCache'
import { computeStreak, computeWeekRange, computeWeekSummary } from '../utils/habitStats'
import { toISODate } from '../utils/dateUtils'

function bannerKeyFor(date) {
  return `momentum_week_banner_${toISODate(date)}`
}

// Résumé de la semaine passée, affiché uniquement le lundi (et jusqu'à ce
// que l'utilisateur le ferme) — disparaît de lui-même le mardi puisque la
// condition `isMonday` ne sera plus vraie.
export default function WeeklyBanner() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  const today = new Date()
  const isMonday = today.getDay() === 1

  useEffect(() => {
    if (!isMonday || !user) return
    if (localStorage.getItem(bannerKeyFor(today))) {
      setDismissed(true)
      return
    }

    let cancelled = false

    async function load() {
      let habitudes
      let completions
      const cached = getCached(`habits:${user.id}`)
      if (cached) {
        habitudes = cached.habitudes
        completions = cached.completions
      } else {
        const [habitudesRes, completionsRes] = await Promise.all([
          supabase.from('habitudes').select('id, nom, emoji').eq('user_id', user.id).eq('actif', true),
          supabase.from('completions').select('habitude_id, date').eq('user_id', user.id),
        ])
        habitudes = habitudesRes.data ?? []
        completions = completionsRes.data ?? []
      }
      if (cancelled) return

      const lastWeekDates = computeWeekRange(today, 1)
      const { percent, bestHabit } = computeWeekSummary(habitudes, completions, lastWeekDates)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const streak = computeStreak(habitudes, completions, yesterday)

      setSummary({ percent, bestHabit, streak })
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonday, user])

  if (!isMonday || dismissed || !summary) return null

  const handleDismiss = () => {
    localStorage.setItem(bannerKeyFor(today), '1')
    setDismissed(true)
  }

  return (
    <div className="relative z-20 border-b-[0.5px] border-[var(--border-faint)] bg-[var(--surface-1)] animate-[page-fade-in_220ms_ease-out]">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap text-xs">
        <p className="text-[var(--text-muted)]">
          Semaine passée : <strong className="text-[var(--text-strong)]">{summary.percent}%</strong>
          {' · '}🔥 Streak : <strong className="text-[var(--text-strong)]">{summary.streak} jours</strong>
          {summary.bestHabit && (
            <>
              {' · '}Meilleure habitude :{' '}
              <strong className="text-[var(--text-strong)]">
                {summary.bestHabit.emoji} {summary.bestHabit.nom}
              </strong>
            </>
          )}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/progress" className="text-[var(--accent)] hover:underline whitespace-nowrap">
            Voir le détail →
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Fermer la bannière hebdomadaire"
            className="text-[var(--text-faint)] hover:text-[var(--text-muted)] text-sm leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
