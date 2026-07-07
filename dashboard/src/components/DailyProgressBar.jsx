import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { getCached } from '../utils/dataCache'
import { toISODate } from '../utils/dateUtils'

const VISIBLE_PATHS = ['/habits', '/engagements', '/projects']

// Ligne de progression du jour, épinglée en haut de l'app — uniquement sur
// les pages où "avancer aujourd'hui" a du sens. Réutilise le cache de
// Habits.jsx quand il est déjà chaud (pas de requête réseau supplémentaire
// si l'utilisateur vient de visiter /habits) ; sinon fait une requête légère
// dédiée (juste les comptes, pas les données complètes de la page).
export default function DailyProgressBar() {
  const { user } = useAuth()
  const location = useLocation()
  const [percent, setPercent] = useState(null)
  const [justCompleted, setJustCompleted] = useState(false)
  const reachedFullRef = useRef(false)

  const visible = Boolean(user) && VISIBLE_PATHS.includes(location.pathname)

  useEffect(() => {
    if (!visible || !user) return
    let cancelled = false

    async function load() {
      const cached = getCached(`habits:${user.id}`)
      if (cached) {
        const todayISO = toISODate(new Date())
        const total = cached.habitudes?.length ?? 0
        const done = new Set(
          (cached.completions ?? [])
            .filter((c) => c.date === todayISO)
            .map((c) => c.habitude_id)
        ).size
        setPercent(total === 0 ? 0 : Math.round((done / total) * 100))
        return
      }

      const todayISO = toISODate(new Date())
      const [{ data: habitudes }, { data: completions }] = await Promise.all([
        supabase.from('habitudes').select('id').eq('user_id', user.id).eq('actif', true),
        supabase
          .from('completions')
          .select('habitude_id')
          .eq('user_id', user.id)
          .eq('date', todayISO),
      ])

      if (cancelled) return
      const total = habitudes?.length ?? 0
      const done = new Set((completions ?? []).map((c) => c.habitude_id)).size
      setPercent(total === 0 ? 0 : Math.round((done / total) * 100))
    }

    load()
    return () => {
      cancelled = true
    }
  }, [visible, user, location.pathname])

  useEffect(() => {
    if (percent >= 100 && !reachedFullRef.current) {
      reachedFullRef.current = true
      setJustCompleted(true)
      const t = setTimeout(() => setJustCompleted(false), 900)
      return () => clearTimeout(t)
    }
    if (percent < 100) reachedFullRef.current = false
  }, [percent])

  if (!visible || percent === null) return null

  const color = percent <= 0 ? '#7f1d1d' : 'var(--accent)'

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] h-[3px] bg-transparent">
      <div
        className={`h-full transition-[width] duration-[600ms] ease-out ${
          justCompleted ? 'animate-[pulse-subtle_400ms_ease-in-out_1]' : ''
        }`}
        style={{ width: `${Math.max(percent, 2)}%`, background: color }}
      />
      {justCompleted && (
        <div className="absolute top-0 left-0 right-0 flex justify-around pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-[2px]"
              style={{
                background: 'var(--accent)',
                animation: `confetti-fall 700ms ease-in ${i * 40}ms forwards`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
