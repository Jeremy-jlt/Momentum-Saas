import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { daysInMonth, formatMonthLabel, toISODate } from '../utils/dateUtils'

const STREAK_THRESHOLD = 0.8
const MAX_STREAK_LOOKBACK_DAYS = 3650

export default function Habits() {
  const { user } = useAuth()
  const today = useMemo(() => new Date(), [])
  const todayISO = toISODate(today)

  const [habitudes, setHabitudes] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [habitudesRes, completionsRes] = await Promise.all([
        supabase
          .from('habitudes')
          .select('*')
          .eq('user_id', user.id)
          .eq('actif', true)
          .order('ordre', { ascending: true }),
        supabase.from('completions').select('habitude_id, date').eq('user_id', user.id),
      ])

      if (cancelled) return

      setHabitudes(habitudesRes.data ?? [])
      setCompletions(completionsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const completionsSet = useMemo(
    () => new Set(completions.map((c) => `${c.habitude_id}|${c.date}`)),
    [completions]
  )

  const completionsByDate = useMemo(() => {
    const map = new Map()
    for (const c of completions) {
      map.set(c.date, (map.get(c.date) || 0) + 1)
    }
    return map
  }, [completions])

  const totalHabitudes = habitudes.length

  const ratioForDate = (dateISO) => {
    if (totalHabitudes === 0) return 0
    return (completionsByDate.get(dateISO) || 0) / totalHabitudes
  }

  const todayCompletedCount = completionsByDate.get(todayISO) || 0
  const todayPercent = totalHabitudes
    ? Math.round((todayCompletedCount / totalHabitudes) * 100)
    : 0

  const streak = useMemo(() => {
    if (totalHabitudes === 0) return 0
    let count = 0
    const cursor = new Date(today)
    for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
      const iso = toISODate(cursor)
      if (ratioForDate(iso) >= STREAK_THRESHOLD) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
    return count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionsByDate, totalHabitudes])

  const monthRate = useMemo(() => {
    if (totalHabitudes === 0) return 0
    const daysElapsed = today.getDate()
    let completed = 0
    for (let day = 1; day <= daysElapsed; day++) {
      const iso = toISODate(new Date(today.getFullYear(), today.getMonth(), day))
      completed += completionsByDate.get(iso) || 0
    }
    const expected = totalHabitudes * daysElapsed
    return expected ? Math.round((completed / expected) * 100) : 0
  }, [completionsByDate, totalHabitudes, today])

  const numDays = daysInMonth(viewYear, viewMonth)
  const dayNumbers = Array.from({ length: numDays }, (_, i) => i + 1)

  const isCurrentMonthView = viewYear === today.getFullYear() && viewMonth === today.getMonth()
  const isPastMonthView =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  const relevantDaysForMonth = isCurrentMonthView
    ? today.getDate()
    : isPastMonthView
      ? numDays
      : 0

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const dateForDay = (day) => new Date(viewYear, viewMonth, day)

  const toggleCompletion = async (habitudeId, dateISO, isChecked) => {
    if (isChecked) {
      setCompletions((prev) => prev.filter((c) => !(c.habitude_id === habitudeId && c.date === dateISO)))
      await supabase
        .from('completions')
        .delete()
        .eq('habitude_id', habitudeId)
        .eq('date', dateISO)
        .eq('user_id', user.id)
    } else {
      setCompletions((prev) => [...prev, { habitude_id: habitudeId, date: dateISO }])
      const { error } = await supabase
        .from('completions')
        .insert({ habitude_id: habitudeId, date: dateISO, user_id: user.id })

      if (error) {
        setCompletions((prev) =>
          prev.filter((c) => !(c.habitude_id === habitudeId && c.date === dateISO))
        )
      }
    }
  }

  const rowPercent = (habitudeId) => {
    if (relevantDaysForMonth === 0) return null
    let count = 0
    for (let day = 1; day <= relevantDaysForMonth; day++) {
      const iso = toISODate(dateForDay(day))
      if (completionsSet.has(`${habitudeId}|${iso}`)) count++
    }
    return Math.round((count / relevantDaysForMonth) * 100)
  }

  const columnPercent = (day) => {
    const date = dateForDay(day)
    if (date > today) return null
    return totalHabitudes ? Math.round(ratioForDate(toISODate(date)) * 100) : 0
  }

  const chartData = useMemo(() => {
    const points = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = toISODate(d)
      points.push({
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        taux: totalHabitudes ? Math.round(ratioForDate(iso) * 100) : 0,
      })
    }
    return points
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionsByDate, totalHabitudes])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  if (habitudes.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Aucune habitude pour le moment</h1>
        <p className="text-gray-400 mb-8">
          Choisis un point de départ pour commencer à suivre tes habitudes.
        </p>
        <Link
          to="/habits/templates"
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Choisir un template
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Habitudes</h1>
        <Link
          to="/habits/manage"
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-4 py-2 text-sm"
        >
          Gérer mes habitudes ✏️
        </Link>
      </div>

      {/* Section A — stats du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Aujourd'hui</p>
          <p className="text-sm text-gray-200 mb-3">
            {todayCompletedCount}/{totalHabitudes} habitudes complétées
          </p>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${todayPercent}%` }}
            />
          </div>
        </div>

        <div className="border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Streak actuel</p>
          <p className="text-2xl font-bold text-emerald-500">{streak} jour{streak > 1 ? 's' : ''}</p>
        </div>

        <div className="border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-2">Taux ce mois</p>
          <p className="text-2xl font-bold">{monthRate}%</p>
        </div>
      </div>

      {/* Section B — grille mensuelle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md w-8 h-8 flex items-center justify-center text-sm"
        >
          &lt;
        </button>
        <p className="text-sm font-bold">{formatMonthLabel(viewYear, viewMonth)}</p>
        <button
          onClick={goToNextMonth}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md w-8 h-8 flex items-center justify-center text-sm"
        >
          &gt;
        </button>
      </div>

      <div className="overflow-x-auto mb-12 border border-gray-800 rounded-lg">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[#0a0a0a] text-left px-3 py-2 min-w-[180px] border-b border-gray-800">
                Habitude
              </th>
              {dayNumbers.map((day) => {
                const isToday =
                  isCurrentMonthView && day === today.getDate()
                return (
                  <th
                    key={day}
                    className={`px-1 py-2 text-center border-b border-gray-800 w-7 ${
                      isToday ? 'bg-emerald-500/10 text-emerald-400 font-bold rounded' : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </th>
                )
              })}
              <th className="px-3 py-2 text-center border-b border-gray-800 text-gray-500">%</th>
            </tr>
          </thead>
          <tbody>
            {habitudes.map((h) => (
              <tr key={h.id} className="hover:bg-[#111111]">
                <td className="sticky left-0 bg-[#0a0a0a] px-3 py-2 border-b border-gray-900">
                  <div className="flex items-center gap-2">
                    <span>{h.emoji}</span>
                    <div>
                      <p className="text-gray-200">{h.nom}</p>
                      {h.categorie && <p className="text-[10px] text-gray-500">{h.categorie}</p>}
                    </div>
                  </div>
                </td>
                {dayNumbers.map((day) => {
                  const date = dateForDay(day)
                  const iso = toISODate(date)
                  const isFuture = date > today
                  const checked = completionsSet.has(`${h.id}|${iso}`)
                  return (
                    <td key={day} className="px-1 py-2 text-center border-b border-gray-900">
                      <button
                        disabled={isFuture}
                        onClick={() => toggleCompletion(h.id, iso, checked)}
                        className={`w-5 h-5 rounded flex items-center justify-center mx-auto text-[10px] transition-colors ${
                          isFuture
                            ? 'bg-gray-900 text-gray-800 cursor-not-allowed'
                            : checked
                              ? 'bg-emerald-500 text-black font-bold'
                              : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </button>
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center border-b border-gray-900 text-gray-400">
                  {rowPercent(h.id) === null ? '—' : `${rowPercent(h.id)}%`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 bg-[#0a0a0a] px-3 py-2 text-gray-500">Par jour</td>
              {dayNumbers.map((day) => {
                const pct = columnPercent(day)
                return (
                  <td key={day} className="px-1 py-2 text-center text-gray-500">
                    {pct === null ? '' : `${pct}`}
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Section C — graphique de progression */}
      <div className="border border-gray-800 rounded-lg p-4">
        <p className="text-sm text-gray-300 mb-4">Progression sur 30 jours</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickMargin={8} />
              <YAxis
                domain={[0, 100]}
                stroke="#6b7280"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value) => [`${value}%`, 'Taux']}
              />
              <Line
                type="monotone"
                dataKey="taux"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
