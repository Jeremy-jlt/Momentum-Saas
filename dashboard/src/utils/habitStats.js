import { toISODate } from './dateUtils'

// Seuil de réussite d'un jour au global : au moins 80% des habitudes actives
// cochées ce jour-là. Repris identique à la logique historique de
// Habits.jsx (streak/bestStreak) pour que les chiffres restent cohérents
// partout dans l'app (bannière hebdo, page /progress).
const STREAK_THRESHOLD = 0.8
const MAX_LOOKBACK_DAYS = 365

export function buildCompletionsByDate(completions) {
  const map = new Map()
  completions.forEach((c) => {
    map.set(c.date, (map.get(c.date) || 0) + 1)
  })
  return map
}

export function computeStreak(habitudes, completions, fromDate = new Date()) {
  const total = habitudes.length
  if (total === 0) return 0
  const byDate = buildCompletionsByDate(completions)
  let count = 0
  const cursor = new Date(fromDate)
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const iso = toISODate(cursor)
    const ratio = (byDate.get(iso) || 0) / total
    if (ratio >= STREAK_THRESHOLD) {
      count++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return count
}

export function computeBestStreakAllTime(habitudes, completions) {
  const total = habitudes.length
  if (total === 0 || completions.length === 0) return 0
  const byDate = buildCompletionsByDate(completions)
  const sortedDates = completions.map((c) => c.date).sort()
  const cursor = new Date(sortedDates[0])
  const today = new Date()
  let maxRun = 0
  let currentRun = 0
  let iterations = 0
  while (cursor <= today && iterations < MAX_LOOKBACK_DAYS) {
    const iso = toISODate(cursor)
    const ratio = (byDate.get(iso) || 0) / total
    if (ratio >= STREAK_THRESHOLD) {
      currentRun++
      if (currentRun > maxRun) maxRun = currentRun
    } else {
      currentRun = 0
    }
    cursor.setDate(cursor.getDate() + 1)
    iterations++
  }
  return maxRun
}

// Lundi comme premier jour de semaine. `weeksAgo=0` -> semaine en cours,
// `weeksAgo=1` -> semaine précédente.
export function computeWeekRange(referenceDate = new Date(), weeksAgo = 0) {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday - weeksAgo * 7)
  d.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(d)
    cur.setDate(d.getDate() + i)
    days.push(toISODate(cur))
  }
  return days
}

export function computeWeekSummary(habitudes, completions, weekDates) {
  const total = habitudes.length
  const weekSet = new Set(weekDates)
  const countByHabit = new Map()
  let totalDone = 0

  completions.forEach((c) => {
    if (!weekSet.has(c.date)) return
    totalDone++
    countByHabit.set(c.habitude_id, (countByHabit.get(c.habitude_id) || 0) + 1)
  })

  const percent = total === 0 ? 0 : Math.round((totalDone / (total * 7)) * 100)

  let bestHabit = null
  let bestCount = -1
  habitudes.forEach((h) => {
    const count = countByHabit.get(h.id) || 0
    if (count > bestCount) {
      bestCount = count
      bestHabit = h
    }
  })

  return { percent, bestHabit, bestCount }
}
