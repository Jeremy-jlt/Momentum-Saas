import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { useCountUp } from '../hooks/useCountUp'
import { SkeletonBlock } from '../components/Skeleton'
import { formatDurationMinutes, formatRelativeDate } from '../utils/dateUtils'
import { computeBestStreakAllTime, computeStreak, computeWeekRange, computeWeekSummary } from '../utils/habitStats'
import ShareButton from '../components/ShareButton'

function CountUpStat({ value, suffix = '' }) {
  const animated = useCountUp(value, 700)
  return (
    <>
      {Math.round(animated)}
      {suffix}
    </>
  )
}

export default function Progress() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [habitudes, setHabitudes] = useState([])
  const [completions, setCompletions] = useState([])
  const [engagements, setEngagements] = useState([])
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [habitudesRes, completionsRes, engagementsRes, sessionsRes] = await Promise.all([
        supabase
          .from('habitudes')
          .select('id, nom, emoji, categorie, created_at')
          .eq('user_id', user.id)
          .eq('actif', true),
        supabase.from('completions').select('habitude_id, date').eq('user_id', user.id),
        supabase
          .from('engagements')
          .select('nom, statut, created_at')
          .eq('user_id', user.id)
          .eq('statut', 'reussi'),
        supabase
          .from('sessions_travail')
          .select('tache, duree_minutes, date, created_at')
          .eq('user_id', user.id),
      ])

      if (cancelled) return

      setHabitudes(habitudesRes.data ?? [])
      setCompletions(completionsRes.data ?? [])
      setEngagements(engagementsRes.data ?? [])
      setSessions(sessionsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const timeline = useMemo(() => {
    const events = []

    habitudes.forEach((h) => {
      if (!h.created_at) return
      events.push({
        id: `habit-${h.id}`,
        icon: h.emoji || '✓',
        label: `Habitude "${h.nom}" créée`,
        date: h.created_at,
      })
    })

    engagements.forEach((e, i) => {
      if (!e.created_at) return
      events.push({
        id: `engagement-${i}`,
        icon: '🎯',
        label: `Engagement "${e.nom}" réussi`,
        date: e.created_at,
      })
    })

    sessions.forEach((s, i) => {
      if (!s.created_at) return
      events.push({
        id: `session-${i}`,
        icon: '⏱',
        label: `Session "${s.tache}" terminée (${formatDurationMinutes(s.duree_minutes)})`,
        date: s.created_at,
      })
    })

    return events.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
  }, [habitudes, engagements, sessions])

  const records = useMemo(() => {
    const bestStreak = computeBestStreakAllTime(habitudes, completions)

    const monthCounts = new Map()
    completions.forEach((c) => {
      const monthKey = c.date.slice(0, 7)
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
    })
    let bestMonth = null
    let bestMonthCount = -1
    monthCounts.forEach((count, key) => {
      if (count > bestMonthCount) {
        bestMonthCount = count
        bestMonth = key
      }
    })
    const bestMonthLabel = bestMonth
      ? new Date(`${bestMonth}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : '—'

    let mostConsistent = null
    let bestRatio = -1
    habitudes.forEach((h) => {
      const count = completions.filter((c) => c.habitude_id === h.id).length
      const daysSince = h.created_at
        ? Math.max(1, Math.floor((Date.now() - new Date(h.created_at).getTime()) / 86400000))
        : 1
      const ratio = count / daysSince
      if (ratio > bestRatio) {
        bestRatio = ratio
        mostConsistent = h
      }
    })

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duree_minutes || 0), 0)

    return {
      bestStreak,
      bestMonthLabel: bestMonthLabel.charAt(0).toUpperCase() + bestMonthLabel.slice(1),
      mostConsistent,
      totalMinutes,
    }
  }, [habitudes, completions, sessions])

  const weekComparison = useMemo(() => {
    const thisWeekDates = computeWeekRange(new Date(), 0)
    const lastWeekDates = computeWeekRange(new Date(), 1)
    const thisWeek = computeWeekSummary(habitudes, completions, thisWeekDates)
    const lastWeek = computeWeekSummary(habitudes, completions, lastWeekDates)
    const diff = thisWeek.percent - lastWeek.percent
    return { thisWeekPercent: thisWeek.percent, lastWeekPercent: lastWeek.percent, diff }
  }, [habitudes, completions])

  const milestones = useMemo(() => {
    const items = []
    const currentStreak = computeStreak(habitudes, completions)
    const bestStreak = computeBestStreakAllTime(habitudes, completions)

    if (bestStreak > 0 && currentStreak < bestStreak) {
      items.push(`Plus que ${bestStreak - currentStreak} jour(s) pour battre ton record de streak (${bestStreak}j).`)
    } else if (bestStreak > 0 && currentStreak >= bestStreak) {
      items.push(`Tu es sur ton meilleur streak jamais atteint : ${currentStreak} jours. 🔥`)
    }

    const categories = new Map()
    habitudes.forEach((h) => {
      const cat = h.categorie || 'Autre'
      if (!categories.has(cat)) categories.set(cat, [])
      categories.get(cat).push(h.id)
    })

    const daysElapsed = new Date().getDate()
    let weakestCat = null
    let weakestPercent = 101
    categories.forEach((ids, cat) => {
      const count = completions.filter(
        (c) => ids.includes(c.habitude_id) && c.date.slice(0, 7) === new Date().toISOString().slice(0, 7)
      ).length
      const expected = ids.length * daysElapsed
      const percent = expected === 0 ? 0 : Math.round((count / expected) * 100)
      if (percent < weakestPercent) {
        weakestPercent = percent
        weakestCat = cat
      }
    })

    if (weakestCat && weakestPercent < 100) {
      items.push(`Tu es à ${weakestPercent}% de ton objectif mensuel "${weakestCat}".`)
    }

    return items
  }, [habitudes, completions])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-4">
        <SkeletonBlock className="h-8 w-1/3" />
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
        <h1 className="text-display">Ta progression</h1>
        <ShareButton
          title="Mes records"
          stats={[
            { label: 'meilleur streak', value: `${records.bestStreak}j`, accent: true },
            { label: 'cette semaine', value: `${weekComparison.thisWeekPercent}%` },
          ]}
        />
      </div>

      <section className="mb-12">
        <h2 className="text-heading mb-4">Ton parcours</h2>
        {timeline.length === 0 ? (
          <p className="text-body">Pas encore d'événement à afficher — reviens après quelques jours d'usage.</p>
        ) : (
          <div className="flex flex-col gap-0 border-l border-[var(--border)] ml-3">
            {timeline.map((event) => (
              <div key={event.id} className="relative pl-6 pb-6 last:pb-0">
                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[var(--surface-2)] border border-[var(--accent)] flex items-center justify-center text-[9px]">
                  {event.icon}
                </span>
                <p className="text-sm text-[var(--text-strong)]">{event.label}</p>
                <p className="text-[11px] text-[var(--text-faint)]">{formatRelativeDate(event.date)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-heading mb-4">Tes records all-time</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-glass border border-[var(--border)] rounded-lg p-5">
            <p className="kicker mb-2">Meilleur streak</p>
            <p className="num text-3xl font-bold text-[var(--accent)]">
              <CountUpStat value={records.bestStreak} suffix="j" />
            </p>
          </div>
          <div className="card-glass border border-[var(--border)] rounded-lg p-5">
            <p className="kicker mb-2">Mois le plus productif</p>
            <p className="text-lg font-bold text-[var(--text-strong)] mt-2">{records.bestMonthLabel}</p>
          </div>
          <div className="card-glass border border-[var(--border)] rounded-lg p-5">
            <p className="kicker mb-2">Habitude la plus régulière</p>
            <p className="text-lg font-bold text-[var(--text-strong)] mt-2">
              {records.mostConsistent ? `${records.mostConsistent.emoji} ${records.mostConsistent.nom}` : '—'}
            </p>
          </div>
          <div className="card-glass border border-[var(--border)] rounded-lg p-5">
            <p className="kicker mb-2">Temps total bloqué</p>
            <p className="text-lg font-bold text-[var(--text-strong)] mt-2">
              {formatDurationMinutes(records.totalMinutes)}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading mb-4">Cette semaine vs semaine dernière</h2>
        <div className="card-glass border border-[var(--border)] rounded-lg p-5 flex items-center gap-6 flex-wrap">
          <div>
            <p className="kicker mb-1">Cette semaine</p>
            <p className="num text-2xl font-bold text-[var(--text-strong)]">{weekComparison.thisWeekPercent}%</p>
          </div>
          <div>
            <p className="kicker mb-1">Semaine dernière</p>
            <p className="num text-2xl font-bold text-[var(--text-faint)]">{weekComparison.lastWeekPercent}%</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-lg font-bold ${
                weekComparison.diff >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'
              }`}
            >
              {weekComparison.diff >= 0 ? '▲' : '▼'} {Math.abs(weekComparison.diff)}%
            </span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-heading mb-4">Prochains jalons</h2>
        {milestones.length === 0 ? (
          <p className="text-body">Continue comme ça, aucun jalon urgent pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {milestones.map((m, i) => (
              <li
                key={i}
                className="card-glass border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text-muted)]"
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
