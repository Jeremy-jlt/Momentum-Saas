import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { daysInMonth, formatDurationMinutes, formatMonthLabel, toISODate } from '../utils/dateUtils'
import Modal from '../components/Modal'
import HabitCell from '../components/HabitCell'
import DraggableWidget from '../components/DraggableWidget'
import OfflineBanner from '../components/OfflineBanner'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { enqueueOfflineAction } from '../utils/offlineQueue'
import { useToast } from '../components/Toast'
import { useIsPro } from '../hooks/useIsPro'
import { SkeletonBlock, SkeletonCard } from '../components/Skeleton'

const STREAK_THRESHOLD = 0.8
const MAX_STREAK_LOOKBACK_DAYS = 3650
const DEFAULT_OBJECTIF_JOURS = 30
const CHART_TYPE_STORAGE_KEY = 'momentum_chart_type'
const LAYOUT_STORAGE_KEY = 'momentum_habit_layout'
const WIDGETS_STORAGE_KEY = 'momentum_widgets'
const WIDGETS_ORDER_STORAGE_KEY = 'momentum_widgets_order'
const DAY_ABBREVIATIONS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

// Widgets réorganisables de la page (layout Focus uniquement — Dashboard,
// Compact et Zen ont chacun leur propre structure et ne sont pas concernés).
const DEFAULT_WIDGETS_ORDER = [
  'stats_cards',
  'weekly_rings',
  'grid',
  'chart',
  'category_breakdown',
  'advanced_stats',
]

// Widgets dont le contenu réel est réservé au Pro (affichent un encart
// verrouillé — déplaçable comme les autres — pour les utilisateurs gratuits).
const PRO_ONLY_WIDGET_IDS = new Set(['weekly_rings', 'category_breakdown', 'advanced_stats'])

function normalizeWidgetsOrder(stored) {
  if (!Array.isArray(stored)) return [...DEFAULT_WIDGETS_ORDER]
  const valid = stored.filter((id) => DEFAULT_WIDGETS_ORDER.includes(id))
  const missing = DEFAULT_WIDGETS_ORDER.filter((id) => !valid.includes(id))
  return [...valid, ...missing]
}

const LAYOUT_OPTIONS = [
  { id: 'focus', icon: '▤', label: 'Focus' },
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'compact', icon: '▦', label: 'Compact' },
  { id: 'zen', icon: '▬', label: 'Zen' },
]

const WIDGET_DEFS = [
  { id: 'stats_cards', label: 'Cartes résumé (streak, taux, aujourd\'hui)', proOnly: false },
  { id: 'weekly_rings', label: 'Anneaux hebdomadaires', proOnly: true },
  { id: 'mood_row', label: "Ligne d'humeur dans la grille", proOnly: true },
  { id: 'chart', label: 'Graphique de progression', proOnly: false },
  { id: 'category_breakdown', label: 'Stats par catégorie', proOnly: true },
  { id: 'advanced_stats', label: 'Statistiques avancées', proOnly: true },
]

function defaultWidgetState() {
  return Object.fromEntries(WIDGET_DEFS.map((w) => [w.id, true]))
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-muted)' },
}

function moodColor(score) {
  if (score === null || score === undefined) return null
  if (score <= 3) return '#ef4444'
  if (score <= 5) return '#f97316'
  if (score <= 7) return '#eab308'
  if (score <= 9) return '#84cc16'
  return 'var(--accent)'
}

function ringColor(percent) {
  if (percent >= 80) return 'var(--accent)'
  if (percent >= 50) return '#6366f1'
  return '#374151'
}

function truncateLabel(text, max = 15) {
  if (!text) return text
  return text.length > max ? `${text.slice(0, max)}...` : text
}

// Palette vert/jaune/rouge utilisée par les nouveaux graphiques circulaires
// et barres horizontales — volontairement distincte de ringColor (anneaux
// hebdomadaires), qui utilise vert/indigo/gris.
function percentColor(percent) {
  if (percent >= 80) return 'var(--accent)'
  if (percent >= 50) return '#eab308'
  return '#ef4444'
}

const RING_CATEGORY_RADII = [60, 48, 36, 24]

// Niveau module pour les mêmes raisons que RingProgress/ProgressRing : ce
// composant a besoin de son propre état pour animer le remplissage des
// anneaux (0 -> percent) à chaque montage, ce qu'une simple fonction
// `renderXxx()` appelée en ligne ne permettrait pas (pas de hooks).
function CategoryRingsChart({ cats, size = 140 }) {
  const center = size / 2
  const [animatedPercents, setAnimatedPercents] = useState(() => cats.map(() => 0))

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedPercents(cats.map((c) => c.percent)))
    return () => cancelAnimationFrame(raf)
  }, [cats])

  return (
    <div className="flex items-center justify-center gap-8 py-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {cats.map((cat, i) => {
          const radius = RING_CATEGORY_RADII[i]
          const circumference = 2 * Math.PI * radius
          const animated = animatedPercents[i] ?? 0
          const offset = circumference * (1 - Math.min(animated, 100) / 100)
          const color = percentColor(cat.percent)
          return (
            <g key={cat.categorie}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--cell-empty)" strokeWidth={8} />
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={8}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-[stroke-dashoffset] duration-[800ms] ease-out"
                transform={`rotate(-90 ${center} ${center})`}
              />
            </g>
          )
        })}
      </svg>
      <div className="flex flex-col gap-2.5">
        {cats.map((cat) => (
          <div key={cat.categorie} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: percentColor(cat.percent) }}
            />
            <span className="text-xs text-[var(--text-muted)]">{cat.categorie}</span>
            <span className="text-xs font-bold" style={{ color: percentColor(cat.percent) }}>
              <AnimatedNumber value={cat.percent} suffix="%" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RingProgress({ size, radius, strokeWidth, percent, color, children }) {
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Démarre à 0 puis rejoint `percent` une frame après le montage : la
  // transition CSS sur strokeDashoffset se charge de l'animation de
  // remplissage, y compris à chaque changement de disposition/type de
  // graphique qui remonte ce composant.
  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedPercent(percent))
    return () => cancelAnimationFrame(raf)
  }, [percent])

  const offset = circumference * (1 - Math.min(Math.max(animatedPercent, 0), 100) / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--cell-empty)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-[800ms] ease-out"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        {children}
      </div>
    </div>
  )
}

function ProgressRing({ percent, label, size = 84, index = 0, animate = false }) {
  const [hovering, setHovering] = useState(false)
  const data = [{ value: percent }, { value: 100 - percent }]
  const innerRadius = Math.round(size * 0.38)
  const outerRadius = Math.round(size * 0.48)
  const baseFontSize = Math.max(10, Math.round(size * 0.17))
  const fontSize = hovering ? baseFontSize + 2 : baseFontSize
  const labelSize = Math.max(9, Math.round(size * 0.13))

  return (
    <div
      className="flex flex-col items-center gap-1.5 shrink-0 transition-transform duration-150"
      style={{ transform: hovering ? 'translateY(-2px)' : 'translateY(0)' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <PieChart width={size} height={size}>
          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            stroke="none"
            isAnimationActive={animate}
            animationDuration={800}
            animationEasing="ease-out"
            animationBegin={index * 100}
          >
            <Cell fill={ringColor(percent)} />
            <Cell fill="var(--cell-empty)" />
          </Pie>
        </PieChart>
        <div
          className="absolute inset-0 flex items-center justify-center font-bold transition-[font-size] duration-150"
          style={{ fontSize }}
        >
          <AnimatedNumber value={percent} suffix="%" />
        </div>
      </div>
      <span className="text-[var(--text-faint)]" style={{ fontSize: labelSize }}>
        {label}
      </span>
    </div>
  )
}

function MoodPopover({ initialScore, onSave, onCancel }) {
  const [value, setValue] = useState(initialScore)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <div className="absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4 w-56 shadow-lg">
        <p className="text-2xl font-bold text-center mb-3" style={{ color: moodColor(value) }}>
          {value}
        </p>
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mood-slider mb-4"
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-3 py-1.5 text-xs"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(value)}
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-black font-bold rounded-md px-3 py-1.5 text-xs"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </>
  )
}

function ChartTypeButton({ type, icon, label, active, locked, onSelect }) {
  const [pressed, setPressed] = useState(false)
  const [popping, setPopping] = useState(false)
  const wasActiveRef = useRef(active)

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      setPopping(true)
      const t = setTimeout(() => setPopping(false), 200)
      wasActiveRef.current = active
      return () => clearTimeout(t)
    }
    wasActiveRef.current = active
  }, [active])

  const handleClick = () => {
    if (locked) return
    setPressed(true)
    setTimeout(() => setPressed(false), 80)
    onSelect(type)
  }

  const transformClass = popping
    ? 'animate-[pop_200ms_ease-in-out]'
    : `transition-transform duration-[80ms] ${pressed ? 'scale-[0.92]' : 'scale-100'}`

  return (
    <div className="relative group/tooltip">
      <button
        onClick={handleClick}
        disabled={locked}
        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs border transition-[background-color,border-color] duration-[120ms] ${transformClass} ${
          locked
            ? 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-subtle)] cursor-not-allowed'
            : active
              ? 'bg-[var(--accent)] border-[var(--accent)] text-black'
              : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-strong)] hover:bg-[var(--border-faint)]'
        }`}
      >
        {icon}
      </button>

      <span
        className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--surface-1)] text-[var(--text-muted)] text-[11px] rounded px-2 py-1 opacity-0 pointer-events-none transition-opacity group-hover/tooltip:opacity-100 group-hover/tooltip:delay-[400ms]"
      >
        {locked ? 'Pro 🔒' : label}
      </span>
    </div>
  )
}

// Compte de la valeur précédente vers la nouvelle (easing cubique, ~600ms) à
// chaque changement de `value` — rejoue naturellement au montage (donc à
// chaque changement de disposition, qui démonte/remonte tout via sa key) en
// partant de 0, et anime aussi les variations en cours de session (coche
// cochée/décochée) sans logique supplémentaire.
function AnimatedNumber({ value, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    const duration = 600
    const start = performance.now()
    let raf

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  )
}

// Composant de niveau module (pas une fonction imbriquée) : sa référence doit
// rester stable entre les rendus de Habits, sinon React le démonte/remonte à
// chaque re-render et l'animation de remplissage rejoue en boucle.
function AnimatedProgressBar({ target }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(target))
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div className="w-full h-[3px] bg-[var(--surface-3)] rounded-full overflow-hidden">
      <div
        className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-[600ms] ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

export default function Habits() {
  const { user } = useAuth()
  const today = useMemo(() => new Date(), [])
  const todayISO = toISODate(today)
  const isOnline = useOnlineStatus()

  const isPro = useIsPro()

  const [habitudes, setHabitudes] = useState([])
  const [completions, setCompletions] = useState([])
  const [sentiments, setSentiments] = useState([])
  const [projets, setProjets] = useState([])
  const [sessionsTravail, setSessionsTravail] = useState([])
  const [openProjectPopoverId, setOpenProjectPopoverId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [chartType, setChartType] = useState(
    () => localStorage.getItem(CHART_TYPE_STORAGE_KEY) || 'line'
  )
  const [layout, setLayout] = useState(() => localStorage.getItem(LAYOUT_STORAGE_KEY) || 'focus')
  const [compactStatsExpanded, setCompactStatsExpanded] = useState(false)
  const [zenIndex, setZenIndex] = useState(0)
  const [ringsAnimated, setRingsAnimated] = useState(false)
  const [shakingCellKey, setShakingCellKey] = useState(null)
  const showToast = useToast()
  const [displayedChartType, setDisplayedChartType] = useState(
    () => (isPro ? chartType : 'line') || 'line'
  )
  const [chartAnimPhase, setChartAnimPhase] = useState('idle')
  const chartAnimTimeoutsRef = useRef([])
  const [showExportModal, setShowExportModal] = useState(false)
  const [showCustomizePanel, setShowCustomizePanel] = useState(false)
  const [openMoodDate, setOpenMoodDate] = useState(null)
  const [widgets, setWidgets] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WIDGETS_STORAGE_KEY))
      return stored ? { ...defaultWidgetState(), ...stored } : defaultWidgetState()
    } catch {
      return defaultWidgetState()
    }
  })
  const [fadingWidgets, setFadingWidgets] = useState({})
  const [widgetsOrder, setWidgetsOrder] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(WIDGETS_ORDER_STORAGE_KEY))
      return normalizeWidgetsOrder(stored)
    } catch {
      return [...DEFAULT_WIDGETS_ORDER]
    }
  })

  const widgetSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Le plan gratuit est limité à la courbe et au layout Focus, quel que soit
  // ce qui a été mémorisé dans localStorage (ex : après une rétrogradation).
  const effectiveChartType = isPro ? chartType : 'line'
  const effectiveLayout = isPro ? layout : 'focus'

  // Transition entre types de graphiques : l'ancien s'efface (150ms) avant
  // que le nouveau apparaisse en fondu + légère montée (200ms) — le contenu
  // affiché (displayedChartType) est volontairement en retard sur le type
  // réellement sélectionné (effectiveChartType) pendant la bascule.
  useEffect(() => {
    if (effectiveChartType === displayedChartType) return

    chartAnimTimeoutsRef.current.forEach(clearTimeout)
    chartAnimTimeoutsRef.current = []

    setChartAnimPhase('out')
    const outTimeout = setTimeout(() => {
      setDisplayedChartType(effectiveChartType)
      setChartAnimPhase('in')
      const inTimeout = setTimeout(() => setChartAnimPhase('idle'), 200)
      chartAnimTimeoutsRef.current.push(inTimeout)
    }, 150)
    chartAnimTimeoutsRef.current.push(outTimeout)
  }, [effectiveChartType, displayedChartType])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [habitudesRes, completionsRes, sentimentsRes, projetsRes, sessionsRes] = await Promise.all([
        supabase
          .from('habitudes')
          .select('*')
          .eq('user_id', user.id)
          .eq('actif', true)
          .order('ordre', { ascending: true }),
        supabase.from('completions').select('habitude_id, date').eq('user_id', user.id),
        supabase.from('sentiments').select('date, score').eq('user_id', user.id),
        supabase.from('projets').select('*').eq('user_id', user.id).eq('actif', true),
        supabase
          .from('sessions_travail')
          .select('projet_id, duree_minutes, date')
          .eq('user_id', user.id),
      ])

      if (cancelled) return

      setHabitudes(habitudesRes.data ?? [])
      setCompletions(completionsRes.data ?? [])
      setSentiments(sentimentsRes.data ?? [])
      setProjets(projetsRes.data ?? [])
      setSessionsTravail(sessionsRes.data ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  // Les anneaux hebdomadaires ne jouent leur animation de remplissage en
  // cascade qu'au chargement de la page — pas à chaque re-render déclenché
  // par une coche ailleurs dans la grille.
  useEffect(() => {
    const t = setTimeout(() => setRingsAnimated(true), 1300)
    return () => clearTimeout(t)
  }, [])

  const handleChartTypeChange = (type) => {
    setChartType(type)
    localStorage.setItem(CHART_TYPE_STORAGE_KEY, type)
  }

  const handleLayoutChange = (id) => {
    setLayout(id)
    localStorage.setItem(LAYOUT_STORAGE_KEY, id)
  }

  const persistWidgets = (next) => {
    localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(next))
  }

  const toggleWidget = (id) => {
    setWidgets((prev) => {
      const next = { ...prev, [id]: !(prev[id] !== false) }
      persistWidgets(next)
      return next
    })
  }

  const hideWidget = (id) => {
    setFadingWidgets((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setWidgets((prev) => {
        const next = { ...prev, [id]: false }
        persistWidgets(next)
        return next
      })
      setFadingWidgets((prev) => ({ ...prev, [id]: false }))
    }, 200)
  }

  const resetWidgets = () => {
    const defaults = defaultWidgetState()
    setWidgets(defaults)
    persistWidgets(defaults)
  }

  // Un widget Pro verrouillé reste déplaçable (il affiche un encart verrouillé
  // à la place de son contenu) — seul un widget explicitement masqué (show =
  // false) sort de la réorganisation. "grid" ne peut jamais être masquée.
  const isWidgetRendered = (id) => {
    if (id === 'grid') return true
    if (PRO_ONLY_WIDGET_IDS.has(id) && !isPro) return true
    return widgets[id] !== false
  }

  const handleWidgetDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgetsOrder((prev) => {
      const oldIndex = prev.indexOf(active.id)
      const newIndex = prev.indexOf(over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      localStorage.setItem(WIDGETS_ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

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

  const sentimentsByDate = useMemo(
    () => new Map(sentiments.map((s) => [s.date, s.score])),
    [sentiments]
  )

  const totalHabitudes = habitudes.length

  const ratioForDate = (dateISO) => {
    if (totalHabitudes === 0) return 0
    return (completionsByDate.get(dateISO) || 0) / totalHabitudes
  }

  const consecutiveStreakEndingAt = (habitudeId, dateISO) => {
    let count = 0
    const cursor = new Date(dateISO)
    while (completionsSet.has(`${habitudeId}|${toISODate(cursor)}`)) {
      count++
      cursor.setDate(cursor.getDate() - 1)
      if (count >= 60) break
    }
    return count
  }

  const heatmapBackground = (habitudeId, dateISO) => {
    const streakLength = consecutiveStreakEndingAt(habitudeId, dateISO)
    if (streakLength >= 6) return '#047857'
    if (streakLength >= 3) return 'var(--accent-hover)'
    return 'var(--accent)'
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

  const bestStreak = useMemo(() => {
    if (totalHabitudes === 0 || completions.length === 0) return 0
    const sortedDates = completions.map((c) => c.date).sort()
    const cursor = new Date(sortedDates[0])
    let maxRun = 0
    let currentRun = 0
    let iterations = 0
    while (cursor <= today && iterations < MAX_STREAK_LOOKBACK_DAYS) {
      const iso = toISODate(cursor)
      if (ratioForDate(iso) >= STREAK_THRESHOLD) {
        currentRun++
        if (currentRun > maxRun) maxRun = currentRun
      } else {
        currentRun = 0
      }
      cursor.setDate(cursor.getDate() + 1)
      iterations++
    }
    return maxRun
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completions, totalHabitudes])

  const monthStats = useMemo(() => {
    const daysElapsed = today.getDate()
    const expected = totalHabitudes * daysElapsed
    let completed = 0
    for (let day = 1; day <= daysElapsed; day++) {
      const iso = toISODate(new Date(today.getFullYear(), today.getMonth(), day))
      completed += completionsByDate.get(iso) || 0
    }
    const rate = expected ? Math.round((completed / expected) * 100) : 0
    return { completed, expected, missed: Math.max(expected - completed, 0), rate }
  }, [completionsByDate, totalHabitudes, today])

  const monthlyHabitudeCounts = useMemo(() => {
    const daysElapsed = today.getDate()
    const counts = new Map()
    habitudes.forEach((h) => counts.set(h.id, 0))
    for (let day = 1; day <= daysElapsed; day++) {
      const iso = toISODate(new Date(today.getFullYear(), today.getMonth(), day))
      habitudes.forEach((h) => {
        if (completionsSet.has(`${h.id}|${iso}`)) {
          counts.set(h.id, (counts.get(h.id) || 0) + 1)
        }
      })
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionsSet, habitudes, today])

  const rankedHabitudes = useMemo(
    () =>
      [...habitudes]
        .map((h) => ({ ...h, count: monthlyHabitudeCounts.get(h.id) || 0 }))
        .sort((a, b) => b.count - a.count),
    [habitudes, monthlyHabitudeCounts]
  )

  const topHabitudes = rankedHabitudes.slice(0, 3)
  const mostNeglected = rankedHabitudes.length > 0 ? rankedHabitudes[rankedHabitudes.length - 1] : null

  // % de réussite du mois (calendaire réel) par habitude — utilisé par les
  // graphiques en barres/anneaux par habitude.
  const habitudeMonthStats = useMemo(() => {
    const daysElapsed = today.getDate()
    return rankedHabitudes.map((h) => ({
      ...h,
      percent: daysElapsed ? Math.round((h.count / daysElapsed) * 100) : 0,
    }))
  }, [rankedHabitudes, today])

  const categoryBreakdown = useMemo(() => {
    const daysElapsed = today.getDate()
    const numDaysMonth = daysInMonth(today.getFullYear(), today.getMonth())
    const groups = new Map()
    habitudes.forEach((h) => {
      const cat = h.categorie || 'Autre'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat).push(h.id)
    })

    const rows = []
    for (const [cat, ids] of groups.entries()) {
      let completed = 0
      for (let day = 1; day <= daysElapsed; day++) {
        const iso = toISODate(new Date(today.getFullYear(), today.getMonth(), day))
        ids.forEach((id) => {
          if (completionsSet.has(`${id}|${iso}`)) completed++
        })
      }
      const expected = ids.length * daysElapsed
      const percent = expected ? Math.round((completed / expected) * 100) : 0
      rows.push({
        categorie: cat,
        percent,
        numDaysMonth,
        completedEquivalent: Math.round((percent / 100) * numDaysMonth),
      })
    }
    return rows.sort((a, b) => b.percent - a.percent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionsSet, habitudes, today])

  const projetsByHabitudeId = useMemo(() => {
    const map = new Map()
    projets.forEach((p) => {
      if (!p.habitude_id) return
      const list = map.get(p.habitude_id) || []
      list.push(p)
      map.set(p.habitude_id, list)
    })
    return map
  }, [projets])

  const workTimeThisMonth = useMemo(() => {
    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const sessionsThisMonth = sessionsTravail.filter((s) => s.date.startsWith(monthPrefix))
    const totalMinutes = sessionsThisMonth.reduce((sum, s) => sum + s.duree_minutes, 0)

    const minutesByProjet = new Map()
    sessionsThisMonth.forEach((s) => {
      minutesByProjet.set(s.projet_id, (minutesByProjet.get(s.projet_id) || 0) + s.duree_minutes)
    })

    const byProjet = [...minutesByProjet.entries()]
      .map(([projetId, minutes]) => ({
        projet: projets.find((p) => p.id === projetId),
        minutes,
      }))
      .filter((row) => row.projet)
      .sort((a, b) => b.minutes - a.minutes)

    return { totalMinutes, byProjet }
  }, [sessionsTravail, projets, today])

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

  const weeks = useMemo(() => {
    const weekCount = Math.ceil(numDays / 7)
    const result = []
    for (let w = 0; w < weekCount; w++) {
      const startDay = w * 7 + 1
      const endDay = Math.min(startDay + 6, numDays)
      const clippedEnd = Math.min(endDay, relevantDaysForMonth)
      let completed = 0
      let slots = 0
      if (clippedEnd >= startDay) {
        for (let day = startDay; day <= clippedEnd; day++) {
          const iso = toISODate(dateForDay(day))
          completed += completionsByDate.get(iso) || 0
        }
        slots = totalHabitudes * (clippedEnd - startDay + 1)
      }
      result.push({
        label: `Sem. ${w + 1}`,
        percent: slots ? Math.round((completed / slots) * 100) : 0,
      })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numDays, relevantDaysForMonth, completionsByDate, totalHabitudes, viewYear, viewMonth])

  const triggerShake = (cellKey) => {
    setShakingCellKey(cellKey)
    setTimeout(() => {
      setShakingCellKey((cur) => (cur === cellKey ? null : cur))
    }, 300)
  }

  const toggleCompletion = async (habitudeId, dateISO, isChecked) => {
    const cellKey = `${habitudeId}|${dateISO}`

    if (isChecked) {
      setCompletions((prev) => prev.filter((c) => !(c.habitude_id === habitudeId && c.date === dateISO)))

      if (!navigator.onLine) {
        enqueueOfflineAction({
          type: 'completion',
          action: 'delete',
          data: { habitude_id: habitudeId, date: dateISO },
        })
        return
      }

      const { error } = await supabase
        .from('completions')
        .delete()
        .eq('habitude_id', habitudeId)
        .eq('date', dateISO)
        .eq('user_id', user.id)

      if (error) {
        setCompletions((prev) => [...prev, { habitude_id: habitudeId, date: dateISO }])
        triggerShake(cellKey)
        showToast("La coche n'a pas pu être retirée. Réessaie.", 'error')
      }
    } else {
      setCompletions((prev) => [...prev, { habitude_id: habitudeId, date: dateISO }])

      if (!navigator.onLine) {
        enqueueOfflineAction({
          type: 'completion',
          action: 'insert',
          data: { habitude_id: habitudeId, date: dateISO, user_id: user.id },
        })
        return
      }

      const { error } = await supabase
        .from('completions')
        .insert({ habitude_id: habitudeId, date: dateISO, user_id: user.id })

      if (error) {
        setCompletions((prev) =>
          prev.filter((c) => !(c.habitude_id === habitudeId && c.date === dateISO))
        )
        triggerShake(cellKey)
        showToast("La coche n'a pas pu être enregistrée. Réessaie.", 'error')
      }
    }
  }

  const saveMood = async (dateISO, score) => {
    const previous = sentiments.find((s) => s.date === dateISO)?.score ?? null

    setSentiments((prev) => {
      const exists = prev.some((s) => s.date === dateISO)
      return exists
        ? prev.map((s) => (s.date === dateISO ? { ...s, score } : s))
        : [...prev, { date: dateISO, score }]
    })
    setOpenMoodDate(null)

    const { error } = await supabase
      .from('sentiments')
      .upsert({ user_id: user.id, date: dateISO, score }, { onConflict: 'user_id,date' })

    if (error) {
      setSentiments((prev) =>
        previous === null
          ? prev.filter((s) => s.date !== dateISO)
          : prev.map((s) => (s.date === dateISO ? { ...s, score: previous } : s))
      )
      showToast("L'humeur n'a pas pu être enregistrée. Réessaie.", 'error')
    }
  }

  const rowStats = (habitudeId) => {
    if (relevantDaysForMonth === 0) return { count: 0, percent: null }
    let count = 0
    for (let day = 1; day <= relevantDaysForMonth; day++) {
      const iso = toISODate(dateForDay(day))
      if (completionsSet.has(`${habitudeId}|${iso}`)) count++
    }
    return { count, percent: Math.round((count / relevantDaysForMonth) * 100) }
  }

  const columnPercent = (day) => {
    const date = dateForDay(day)
    if (date > today) return null
    return totalHabitudes ? Math.round(ratioForDate(toISODate(date)) * 100) : 0
  }

  const columnPercentColorClass = (pct) => {
    if (pct === null) return 'text-[var(--text-subtle)]'
    if (pct === 0) return 'text-[var(--danger)]/70'
    if (pct >= 80) return 'text-[var(--accent)]'
    return 'text-[var(--text-faint)]'
  }

  const gridMonthRate = useMemo(() => {
    if (totalHabitudes === 0 || relevantDaysForMonth === 0) return 0
    let completed = 0
    for (let day = 1; day <= relevantDaysForMonth; day++) {
      const iso = toISODate(dateForDay(day))
      completed += completionsByDate.get(iso) || 0
    }
    const expected = totalHabitudes * relevantDaysForMonth
    return expected ? Math.round((completed / expected) * 100) : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionsByDate, totalHabitudes, relevantDaysForMonth, viewYear, viewMonth])

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

  const last7Days = (habitudeId) => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = toISODate(d)
      days.push({ iso, date: d, checked: completionsSet.has(`${habitudeId}|${iso}`) })
    }
    return days
  }

  const handleExport = () => {
    if (!isPro) {
      setShowExportModal(true)
      return
    }

    const habitudeById = new Map(habitudes.map((h) => [h.id, h.nom]))
    const rows = [['habitude', 'date', 'statut']]
    completions.forEach((c) => {
      rows.push([habitudeById.get(c.habitude_id) || c.habitude_id, c.date, 'complétée'])
    })
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentum-habitudes-${todayISO}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonBlock className="h-64 w-full mb-6" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    )
  }

  if (habitudes.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Aucune habitude pour le moment</h1>
        <p className="text-[var(--text-faint)] mb-8">
          Choisis un point de départ pour commencer à suivre tes habitudes.
        </p>
        <Link
          to="/habits/templates"
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Choisir un template
        </Link>
      </div>
    )
  }

  // Rendu d'un widget : gère la persistance de visibilité, le bouton × au
  // survol et le remplacement par un encart verrouillé pour les widgets Pro
  // quand l'utilisateur est en plan gratuit.
  const renderWidget = (id, content, { proOnly = false, lockedTitle = '', lockedDescription = '' } = {}) => {
    if (proOnly && !isPro) {
      return (
        <div className="card-glass border border-[var(--border)] rounded-lg p-8 text-center mb-10">
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-bold mb-1">{lockedTitle}</p>
          <p className="text-sm text-[var(--text-faint)]">{lockedDescription}</p>
        </div>
      )
    }
    if (widgets[id] === false) return null
    return (
      <div
        className={`relative group transition-opacity duration-200 ${
          fadingWidgets[id] ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <button
          onClick={() => hideWidget(id)}
          title="Masquer ce widget"
          className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-faint)] text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          ×
        </button>
        {content}
      </div>
    )
  }

  const renderStatCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div
        className="card-glass border border-[var(--border)] rounded-lg p-5 transition-transform duration-200 hover:-translate-y-0.5 animate-[slide-up_300ms_ease-out]"
        style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
      >
        <p className="kicker mb-2">Ce mois</p>
        <p className="num text-3xl font-bold text-[var(--accent)]">
          <AnimatedNumber value={monthStats.rate} suffix="%" />
        </p>
      </div>

      <div
        className="card-glass border border-[var(--border)] rounded-lg p-5 transition-transform duration-200 hover:-translate-y-0.5 animate-[slide-up_300ms_ease-out]"
        style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}
      >
        <p className="kicker mb-2">🔥 Série en cours</p>
        <p
          className={`num text-3xl font-bold inline-block ${
            streak > 0 ? 'animate-[pulse-subtle_2s_ease-in-out_infinite]' : ''
          }`}
        >
          <AnimatedNumber value={streak} />
          <span className="text-sm text-[var(--text-faint)]"> j</span>
        </p>
      </div>

      <div
        className="card-glass border border-[var(--border)] rounded-lg p-5 transition-transform duration-200 hover:-translate-y-0.5 animate-[slide-up_300ms_ease-out]"
        style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}
      >
        <p className="kicker mb-2">Aujourd'hui</p>
        <p className="num text-3xl font-bold mb-3">
          <AnimatedNumber value={todayCompletedCount} />
          <span className="text-sm text-[var(--text-faint)]">/{totalHabitudes}</span>
        </p>
        <AnimatedProgressBar target={todayPercent} />
      </div>
    </div>
  )

  const renderCondensedStats = () => (
    <div
      className="text-sm text-[var(--text-muted)] mb-6 flex items-center gap-2 flex-wrap animate-[slide-up_300ms_ease-out]"
      style={{ animationFillMode: 'backwards' }}
    >
      <span>
        Mois:{' '}
        <strong className="text-[var(--accent)]">
          <AnimatedNumber value={monthStats.rate} suffix="%" />
        </strong>
      </span>
      <span className="text-[var(--text-subtle)]">·</span>
      <span>
        Streak: <strong><AnimatedNumber value={streak} /></strong>🔥
      </span>
      <span className="text-[var(--text-subtle)]">·</span>
      <span>
        Aujourd'hui: <strong><AnimatedNumber value={todayCompletedCount} />/{totalHabitudes}</strong>
      </span>
    </div>
  )

  const renderRingsSection = (size = 84, stacked = false) => (
    <div
      className={`card-glass border border-[var(--border)] rounded-lg p-5 mb-10 flex gap-6 ${
        stacked ? 'flex-col' : 'items-center overflow-x-auto'
      }`}
    >
      <div
        className={`flex flex-col justify-center gap-1.5 shrink-0 ${
          stacked ? 'pb-4 border-b border-[var(--border)]' : 'pr-6 border-r border-[var(--border)]'
        }`}
      >
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-faint)]">Summary</p>
        <p className="text-2xl font-bold">
          <AnimatedNumber value={monthStats.completed} />
          <span className="text-xs text-[var(--text-faint)] font-normal"> complétées</span>
        </p>
        <p className="text-xs text-[var(--text-faint)]">
          / <AnimatedNumber value={monthStats.expected} /> attendues
        </p>
        <div className="relative w-16 h-16 mt-1">
          <PieChart width={64} height={64}>
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              startAngle={90}
              endAngle={90 - 360 * (monthStats.rate / 100)}
              innerRadius={24}
              outerRadius={30}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill="var(--accent)" />
            </Pie>
          </PieChart>
        </div>
      </div>

      <div className={stacked ? 'grid grid-cols-2 gap-4' : 'flex items-center gap-6'}>
        {weeks.map((w, i) => (
          <ProgressRing
            key={w.label}
            percent={w.percent}
            label={w.label}
            size={size}
            index={i}
            animate={!ringsAnimated}
          />
        ))}
      </div>
    </div>
  )

  const renderRingsRow = (size = 60) => (
    <div className="flex items-center gap-4 overflow-x-auto mb-6">
      {weeks.map((w, i) => (
        <ProgressRing
          key={w.label}
          percent={w.percent}
          label={w.label}
          size={size}
          index={i}
          animate={!ringsAnimated}
        />
      ))}
    </div>
  )

  const renderGrid = (density = 'normal') => {
    const compact = density === 'compact'
    const tableFont = compact ? 'text-[11px]' : 'text-xs'
    const nameMinW = compact ? 'min-w-[110px]' : 'min-w-[160px]'
    const colWidth = compact ? 'w-5' : 'w-6'
    const cellPad = compact ? 'px-0 py-1' : 'px-0.5 py-1.5'
    const cellSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
    const cellFont = compact ? 'text-[8px]' : 'text-[9px]'
    const percentFont = compact ? 'text-[10px]' : ''
    const showMoodRow = widgets.mood_row !== false

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md w-8 h-8 flex items-center justify-center text-sm"
          >
            &lt;
          </button>
          <p className="text-sm font-bold">{formatMonthLabel(viewYear, viewMonth)}</p>
          <button
            onClick={goToNextMonth}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md w-8 h-8 flex items-center justify-center text-sm"
          >
            &gt;
          </button>
        </div>

        <div className="overflow-x-auto mb-12 bg-[var(--surface-0)] border border-[var(--border)] rounded-lg">
          <table className={`${tableFont} border-collapse`}>
            <thead>
              <tr>
                <th
                  className={`sticky left-0 bg-[var(--surface-0)] text-left px-3 py-2 ${nameMinW} border-b border-[var(--border)]`}
                >
                  Habitude
                </th>
                {dayNumbers.map((day) => {
                  const date = dateForDay(day)
                  const isToday = isCurrentMonthView && day === today.getDate()
                  const isFuture = date > today
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const dayLabel = DAY_ABBREVIATIONS[date.getDay()]
                  return (
                    <th
                      key={day}
                      className={`px-0.5 pt-1.5 pb-1 text-center border-b border-[var(--border)] ${colWidth} ${
                        isToday ? 'bg-[var(--surface-1)]' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span
                          className={
                            isToday
                              ? 'text-[var(--accent)] font-bold'
                              : isFuture
                                ? 'text-[var(--text-subtle)]'
                                : isWeekend
                                  ? 'text-[var(--text-faint)]'
                                  : 'text-[var(--text-faint)]'
                          }
                        >
                          {day}
                        </span>
                        <span className="text-[8px] text-[var(--text-subtle)]">{dayLabel}</span>
                      </div>
                    </th>
                  )
                })}
                <th className="px-3 py-2 text-center border-b border-[var(--border)] text-[var(--text-faint)]">%</th>
              </tr>
              <tr>
                <th className="sticky left-0 bg-[var(--surface-0)] border-b border-[var(--border)]" />
                {dayNumbers.map((day) => {
                  const isToday = isCurrentMonthView && day === today.getDate()
                  const pct = columnPercent(day)
                  return (
                    <th
                      key={day}
                      className={`px-0.5 pb-1 text-center font-normal text-[10px] border-b border-[var(--border)] ${columnPercentColorClass(pct)} ${
                        isToday ? 'bg-[var(--surface-1)]' : ''
                      }`}
                    >
                      {pct === null ? '' : `${pct}%`}
                    </th>
                  )
                })}
                <th className="border-b border-[var(--border)]" />
              </tr>
            </thead>
            <tbody>
              {habitudes.map((h) => {
                const stats = rowStats(h.id)
                const objectif = h.objectif_jours || DEFAULT_OBJECTIF_JOURS
                const expectedPace = relevantDaysForMonth
                  ? objectif * (relevantDaysForMonth / numDays)
                  : 0
                const atteint = stats.count >= objectif
                const enBonneVoie = !atteint && stats.count >= expectedPace * 0.8
                const barColor = atteint ? 'bg-[var(--accent)]' : enBonneVoie ? 'bg-orange-500' : 'bg-[var(--surface-3)]'
                const barWidth = Math.min(100, Math.round((stats.count / objectif) * 100))

                const linkedProjets = projetsByHabitudeId.get(h.id) || []

                return (
                  <tr key={h.id} className="hover:bg-[var(--surface-1)]">
                    <td className="sticky left-0 bg-[var(--surface-0)] px-3 py-1.5 border-b border-[var(--border)]">
                      <div className="relative flex items-center gap-2">
                        <span>{h.emoji}</span>
                        <div>
                          <p className="text-[var(--text-muted)]">{compact ? truncateLabel(h.nom) : h.nom}</p>
                          {!compact && h.categorie && (
                            <p className="text-[10px] text-[var(--text-faint)]">{h.categorie}</p>
                          )}
                        </div>
                        {linkedProjets.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenProjectPopoverId(openProjectPopoverId === h.id ? null : h.id)
                            }
                            title="Projets liés"
                            className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] text-xs shrink-0"
                          >
                            📁
                          </button>
                        )}
                        {openProjectPopoverId === h.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenProjectPopoverId(null)}
                            />
                            <div className="absolute z-50 top-full mt-1 left-0 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-3 w-56 shadow-lg">
                              <p className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-2">
                                Projets liés
                              </p>
                              <div className="flex flex-col gap-2 mb-2">
                                {linkedProjets.map((p) => (
                                  <div key={p.id} className="flex items-center gap-2 text-sm">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ background: p.couleur }}
                                    />
                                    <span className="text-[var(--text-muted)]">{p.nom}</span>
                                  </div>
                                ))}
                              </div>
                              <Link
                                to={`/projects/${linkedProjets[0].id}`}
                                className="text-xs text-[var(--accent)] hover:underline"
                              >
                                Voir les sessions →
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    {dayNumbers.map((day) => {
                      const date = dateForDay(day)
                      const iso = toISODate(date)
                      const isToday = isCurrentMonthView && day === today.getDate()
                      const checked = completionsSet.has(`${h.id}|${iso}`)
                      const state = checked
                        ? 'checked'
                        : iso > todayISO
                          ? 'future'
                          : iso < todayISO
                            ? 'missed'
                            : 'unchecked'
                      const heatStyle =
                        state === 'checked' && isPro
                          ? { background: heatmapBackground(h.id, iso) }
                          : undefined
                      return (
                        <td
                          key={day}
                          className={`${cellPad} text-center border-b border-[var(--border)] ${
                            isToday ? 'bg-[var(--surface-1)]' : ''
                          }`}
                        >
                          <HabitCell
                            state={state}
                            onClick={() => toggleCompletion(h.id, iso, checked)}
                            title={state === 'missed' ? 'Rattraper cette journée ?' : undefined}
                            size={cellSize}
                            fontSize={cellFont}
                            style={heatStyle}
                            shake={shakingCellKey === `${h.id}|${iso}`}
                          />
                        </td>
                      )
                    })}
                    <td
                      className={`num px-3 py-1.5 text-center border-b border-[var(--border)] text-[var(--text-faint)] min-w-[70px] ${percentFont}`}
                    >
                      {stats.percent === null ? (
                        '—'
                      ) : !isPro ? (
                        `${stats.percent}%`
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className={compact ? 'text-[10px]' : 'text-[11px]'}>
                            {stats.count}/{objectif}
                          </span>
                          <div className="w-14 h-1 bg-[var(--surface-3)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {/* Ligne humeur — Premium, en bas du tableau */}
              {showMoodRow && (
                <tr
                  className={`border-t-2 border-[var(--border)] transition-opacity duration-200 ${
                    fadingWidgets.mood_row ? 'opacity-0' : !isPro ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <td className="sticky left-0 bg-[var(--surface-0)] px-3 py-3 border-t-2 border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">😊 Humeur</span>
                      {!isPro && (
                        <span className="text-[9px] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
                          Pro 🔒
                        </span>
                      )}
                      {isPro && (
                        <button
                          onClick={() => hideWidget('mood_row')}
                          title="Masquer cette ligne"
                          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] text-xs ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                  {dayNumbers.map((day) => {
                    const date = dateForDay(day)
                    const iso = toISODate(date)
                    const isToday = isCurrentMonthView && day === today.getDate()
                    const score = sentimentsByDate.get(iso)
                    const color = moodColor(score)
                    const isFuture = iso > todayISO
                    const state = isFuture || !isPro ? 'future' : color ? 'custom' : 'unchecked'

                    return (
                      <td
                        key={day}
                        className={`relative px-0.5 py-2.5 text-center border-t-2 border-[var(--border)] ${
                          isToday ? 'bg-[var(--surface-1)]' : ''
                        }`}
                      >
                        <HabitCell
                          state={state}
                          onClick={() => setOpenMoodDate(iso)}
                          size={cellSize}
                          fontSize={cellFont}
                          style={color ? { background: color } : undefined}
                        />
                        {openMoodDate === iso && (
                          <MoodPopover
                            initialScore={score || 5}
                            onCancel={() => setOpenMoodDate(null)}
                            onSave={(value) => saveMood(iso, value)}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td className="border-t-2 border-[var(--border)]" />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 bg-[var(--surface-0)] px-3 py-2 text-[var(--text-faint)] font-bold">
                  Mois : {gridMonthRate}%
                </td>
                <td colSpan={numDays + 1} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  const CHART_TYPE_TITLES = {
    line: 'Progression sur 30 jours',
    bar: 'Progression sur 30 jours',
    bars_habits: 'Taux de réussite par habitude',
    bars_categories: 'Taux de réussite par catégorie',
    bars_topflop: 'Top & Flop ce mois',
    rings_habits: 'Anneaux par habitude',
    rings_categories: 'Répartition par catégorie',
    rings_global: "Vue d'ensemble du mois",
  }

  const CHART_TYPE_GROUPS = [
    [
      { type: 'line', icon: '📈', label: 'Courbe' },
      { type: 'bar', icon: '📊', label: 'Histogramme' },
      { type: 'bars_habits', icon: '≡', label: 'Barres par habitude' },
      { type: 'bars_categories', icon: '⊟', label: 'Barres par catégorie' },
      { type: 'bars_topflop', icon: '⊞', label: 'Top & Flop' },
    ],
    [
      { type: 'rings_habits', icon: '🔵', label: 'Anneaux par habitude' },
      { type: 'rings_categories', icon: '⭕', label: 'Anneaux concentriques' },
      { type: 'rings_global', icon: '🎯', label: 'Anneau global' },
    ],
  ]

  const renderChartTypeButton = (opt) => (
    <ChartTypeButton
      key={opt.type}
      type={opt.type}
      icon={opt.icon}
      label={opt.label}
      active={effectiveChartType === opt.type}
      locked={opt.type !== 'line' && !isPro}
      onSelect={handleChartTypeChange}
    />
  )

  const renderChartBarsHabits = () => (
    <div className="flex flex-col gap-3 py-2">
      {habitudeMonthStats.map((h) => (
        <div key={h.id} className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] w-[140px] shrink-0 truncate">
            {h.emoji} {h.nom}
          </span>
          <div className="flex-1 h-1.5 bg-[var(--cell-empty)] rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{ width: `${h.percent}%`, background: percentColor(h.percent) }}
            />
          </div>
          <span
            className="text-xs font-semibold w-9 shrink-0 text-right"
            style={{ color: percentColor(h.percent) }}
          >
            {h.percent}%
          </span>
        </div>
      ))}
    </div>
  )

  const renderChartBarsCategories = () => (
    <div className="flex flex-col gap-3.5 py-2">
      {categoryBreakdown.map((row) => (
        <div key={row.categorie} className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wide text-[var(--text-faint)] w-[100px] shrink-0 truncate">
            {row.categorie}
          </span>
          <div className="flex-1 h-1.5 bg-[var(--cell-empty)] rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{ width: `${row.percent}%`, background: percentColor(row.percent) }}
            />
          </div>
          <span className="text-[11px] text-[var(--text-faint)] w-[60px] shrink-0 text-right">
            {row.completedEquivalent} / {row.numDaysMonth} j
          </span>
        </div>
      ))}
    </div>
  )

  const renderChartBarsTopFlop = () => {
    const sortedDesc = [...habitudeMonthStats].sort((a, b) => b.percent - a.percent)
    const top3 = sortedDesc.slice(0, 3)
    const flop3 = [...sortedDesc].sort((a, b) => a.percent - b.percent).slice(0, 3)

    const renderRow = (h, badgeLabel, badgeBg, badgeColor) => (
      <div key={h.id} className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold rounded-[3px] px-1.5 py-0.5 shrink-0"
          style={{ background: badgeBg, color: badgeColor }}
        >
          {badgeLabel}
        </span>
        <span className="text-xs text-[var(--text-muted)] truncate flex-1">
          {h.emoji} {h.nom}
        </span>
        <span className="text-xs font-semibold shrink-0" style={{ color: badgeColor }}>
          {h.percent}%
        </span>
      </div>
    )

    return (
      <div className="grid grid-cols-2 gap-5 py-2">
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-[var(--text-faint)] mb-1">Top ce mois</p>
          {top3.map((h) => renderRow(h, 'TOP', 'var(--accent-contrast)', 'var(--accent)'))}
        </div>
        <div className="flex flex-col gap-2.5 border-l-[0.5px] border-[var(--border-faint)] pl-5">
          <p className="text-xs text-[var(--text-faint)] mb-1">Flop ce mois</p>
          {flop3.map((h) => renderRow(h, 'FLOP', 'var(--danger-bg)', '#ef4444'))}
        </div>
      </div>
    )
  }

  const renderChartRingsHabits = () => (
    <div className="flex flex-wrap gap-4 justify-center py-2">
      {habitudeMonthStats.map((h) => (
        <div key={h.id} className="flex flex-col items-center gap-1.5 w-20">
          <RingProgress
            size={64}
            radius={26}
            strokeWidth={6}
            percent={h.percent}
            color={percentColor(h.percent)}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-strong)' }}>
              <AnimatedNumber value={h.percent} suffix="%" />
            </span>
          </RingProgress>
          <span
            className="text-center truncate w-full"
            style={{ fontSize: 10, color: 'var(--text-faint)' }}
            title={`${h.emoji} ${h.nom}`}
          >
            {h.emoji} {truncateLabel(h.nom, 12)}
          </span>
        </div>
      ))}
    </div>
  )

  const renderChartRingsCategories = () => (
    <CategoryRingsChart cats={categoryBreakdown.slice(0, 4)} size={140} />
  )

  const renderChartRingsGlobal = () => (
    <div className="flex items-center justify-center gap-6 py-2 flex-wrap">
      <RingProgress
        size={100}
        radius={42}
        strokeWidth={8}
        percent={monthStats.rate}
        color={percentColor(monthStats.rate)}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          <AnimatedNumber value={monthStats.rate} suffix="%" />
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>ce mois</span>
      </RingProgress>
      <div className="flex flex-wrap gap-3">
        {categoryBreakdown.map((cat) => (
          <div key={cat.categorie} className="flex flex-col items-center gap-1 w-[60px]">
            <RingProgress
              size={48}
              radius={18}
              strokeWidth={6}
              percent={cat.percent}
              color={percentColor(cat.percent)}
            >
              <span style={{ fontSize: 9, fontWeight: 700 }}>
                <AnimatedNumber value={cat.percent} suffix="%" />
              </span>
            </RingProgress>
            <span className="text-center truncate w-full" style={{ fontSize: 9, color: 'var(--text-faint)' }}>
              {cat.categorie}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderChartSection = () => {
    const isRechartsType = displayedChartType === 'line' || displayedChartType === 'bar'
    const chartBodyClass =
      chartAnimPhase === 'out'
        ? 'transition-opacity duration-150 opacity-0'
        : chartAnimPhase === 'in'
          ? 'animate-[slide-up_200ms_ease-out]'
          : 'opacity-100'

    return (
      <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-lg p-4 mb-12">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm text-[var(--text-muted)]">
            {CHART_TYPE_TITLES[displayedChartType] || 'Progression sur 30 jours'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {CHART_TYPE_GROUPS[0].map(renderChartTypeButton)}
            </div>
            <div className="w-[0.5px] h-5 bg-[var(--border)] shrink-0" />
            <div className="flex items-center gap-1">
              {CHART_TYPE_GROUPS[1].map(renderChartTypeButton)}
            </div>
          </div>
        </div>

        <div className={chartBodyClass}>
          {isRechartsType ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {displayedChartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid stroke="var(--border-faint)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={11} tickMargin={8} />
                    <YAxis
                      domain={[0, 100]}
                      stroke="var(--text-faint)"
                      fontSize={11}
                      tickFormatter={(v) => `${v}%`}
                      width={40}
                    />
                    <Tooltip {...chartTooltipStyle} formatter={(value) => [`${value}%`, 'Taux']} />
                    <Bar dataKey="taux" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="var(--border-faint)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={11} tickMargin={8} />
                    <YAxis
                      domain={[0, 100]}
                      stroke="var(--text-faint)"
                      fontSize={11}
                      tickFormatter={(v) => `${v}%`}
                      width={40}
                    />
                    <Tooltip {...chartTooltipStyle} formatter={(value) => [`${value}%`, 'Taux']} />
                    <Line type="monotone" dataKey="taux" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : displayedChartType === 'bars_habits' ? (
            renderChartBarsHabits()
          ) : displayedChartType === 'bars_categories' ? (
            renderChartBarsCategories()
          ) : displayedChartType === 'bars_topflop' ? (
            renderChartBarsTopFlop()
          ) : displayedChartType === 'rings_habits' ? (
            renderChartRingsHabits()
          ) : displayedChartType === 'rings_categories' ? (
            renderChartRingsCategories()
          ) : (
            renderChartRingsGlobal()
          )}
        </div>
      </div>
    )
  }

  const renderAdvancedStatsMain = () => (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-4">Statistiques avancées</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <p className="kicker mb-2">🏆 Ton record</p>
          <p className="num text-2xl font-bold text-[var(--accent)]">{bestStreak}<span className="text-sm text-[var(--text-faint)]"> jours</span></p>
        </div>

        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <p className="kicker mb-3">Top habitudes du mois</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {topHabitudes.map((h) => (
              <li key={h.id} className="flex justify-between">
                <span>
                  {h.emoji} {h.nom}
                </span>
                <span className="text-[var(--text-faint)]">{h.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-glass border border-[var(--border)] rounded-lg p-5 mb-4">
        <p className="kicker mb-2">Habitude la plus négligée</p>
        {mostNeglected && (
          <p className="text-base">
            {mostNeglected.emoji} {mostNeglected.nom} — {mostNeglected.count} fois ce mois
          </p>
        )}
      </div>

      {workTimeThisMonth.byProjet.length > 0 && (
        <div className="card-glass border border-[var(--border)] rounded-lg p-5">
          <p className="kicker mb-1">Temps de travail ce mois</p>
          <p className="num text-2xl font-bold mb-4">
            {formatDurationMinutes(workTimeThisMonth.totalMinutes)}
          </p>
          <div className="flex flex-col gap-3">
            {workTimeThisMonth.byProjet.map(({ projet, minutes }) => (
              <div key={projet.id} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-faint)] w-28 shrink-0 truncate">{projet.nom}</span>
                <div className="flex-1 h-2 bg-[var(--cell-empty)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((minutes / workTimeThisMonth.totalMinutes) * 100)}%`,
                      background: projet.couleur,
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--text-faint)] w-16 text-right shrink-0">
                  {formatDurationMinutes(minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderCategoryBreakdown = () => (
    <div className="card-glass border border-[var(--border)] rounded-lg p-5">
      <p className="kicker mb-3">Répartition par catégorie</p>
      <div className="flex flex-col gap-3">
        {categoryBreakdown.map((row) => (
          <div key={row.categorie} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-faint)] w-28 shrink-0">{row.categorie}</span>
            <div className="flex-1 h-2 bg-[var(--cell-empty)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full"
                style={{ width: `${row.percent}%` }}
              />
            </div>
            <span className="num text-xs text-[var(--text-faint)] w-10 text-right">{row.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderZenRing = (h) => {
    const stats = rowStats(h.id)
    const objectif = h.objectif_jours || DEFAULT_OBJECTIF_JOURS
    const expectedPace = relevantDaysForMonth ? objectif * (relevantDaysForMonth / numDays) : 0
    const atteint = stats.count >= objectif
    const enBonneVoie = !atteint && stats.count >= expectedPace * 0.8
    const color = stats.count === 0 ? '#374151' : atteint || enBonneVoie ? 'var(--accent)' : '#6366f1'
    const percent = stats.percent ?? 0
    const data = [{ value: percent }, { value: 100 - percent }]

    return (
      <div className="relative mx-auto" style={{ width: 160, height: 160 }}>
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            innerRadius={60}
            outerRadius={76}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="var(--cell-empty)" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{stats.count}</span>
          <span className="text-xs text-[var(--text-faint)]">/ {numDays}</span>
        </div>
      </div>
    )
  }

  const renderZenWeek = (h) => {
    const days = last7Days(h.id)
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        {days.map((d) => {
          const state =
            d.iso === todayISO
              ? d.checked
                ? 'checked'
                : 'unchecked'
              : d.iso > todayISO
                ? 'future'
                : d.checked
                  ? 'checked'
                  : 'missed'
          const label = `${DAY_ABBREVIATIONS[d.date.getDay()]} ${d.date.getDate()}`
          return (
            <div key={d.iso} className="flex flex-col items-center gap-1">
              <HabitCell
                state={state}
                size="w-6 h-6"
                fontSize="text-sm"
                onClick={() => toggleCompletion(h.id, d.iso, d.checked)}
                title={state === 'missed' ? 'Rattraper cette journée ?' : undefined}
                shake={shakingCellKey === `${h.id}|${d.iso}`}
              />
              <span className="text-[10px] text-[var(--text-faint)]">{label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderZenCard = (h) => {
    const todayChecked = completionsSet.has(`${h.id}|${todayISO}`)

    return (
      <div
        className="card-glass border border-[var(--border)] rounded-lg px-8 py-10 flex flex-col items-center"
        style={{ minHeight: '60vh' }}
      >
        <span style={{ fontSize: 48, lineHeight: 1 }}>{h.emoji}</span>
        <p className="text-2xl font-bold mt-3">{h.nom}</p>
        {h.categorie && <p className="text-xs text-[var(--text-faint)] mt-1">{h.categorie}</p>}

        <div className="my-8">{renderZenRing(h)}</div>

        {renderZenWeek(h)}

        <div className="w-full max-w-sm mt-auto pt-10">
          {todayChecked ? (
            <div className="text-center">
              <button
                disabled
                className="w-full rounded-lg font-bold text-base cursor-default transition-colors duration-300"
                style={{ height: 52, background: 'var(--accent-hover)', color: 'var(--accent-contrast)' }}
              >
                <span className="inline-block animate-[pop_300ms_ease-in-out]">✓</span> Fait
                aujourd'hui
              </button>
              <button
                onClick={() => toggleCompletion(h.id, todayISO, true)}
                className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] mt-2 underline"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => toggleCompletion(h.id, todayISO, false)}
              className="momentum-pulse-subtle active:scale-[0.97] transition-[background-color,transform] duration-[80ms] w-full rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold text-base"
              style={{ height: 52 }}
            >
              ✓ Marquer comme faite aujourd'hui
            </button>
          )}
        </div>
      </div>
    )
  }

  const focusWidgetRenderers = {
    stats_cards: () => renderWidget('stats_cards', renderStatCards()),
    weekly_rings: () =>
      renderWidget('weekly_rings', renderRingsSection(84, false), {
        proOnly: true,
        lockedTitle: 'Anneaux hebdomadaires',
        lockedDescription: 'Visualise ta progression semaine par semaine. Débloque avec le plan Discipline+.',
      }),
    grid: () => renderGrid('normal'),
    chart: () => renderWidget('chart', renderChartSection()),
    category_breakdown: () =>
      renderWidget('category_breakdown', renderCategoryBreakdown(), {
        proOnly: true,
        lockedTitle: 'Stats par catégorie',
        lockedDescription: "Découvre quelles catégories d'habitudes tu tiens le mieux. Débloque avec le plan Discipline+.",
      }),
    advanced_stats: () =>
      renderWidget('advanced_stats', renderAdvancedStatsMain(), {
        proOnly: true,
        lockedTitle: 'Statistiques avancées',
        lockedDescription: 'Record de streak, top habitudes, habitude négligée. Débloque avec le plan Discipline+.',
      }),
  }

  const renderFocusLayout = () => {
    const orderedIds = widgetsOrder.filter(isWidgetRendered)

    return (
      <DndContext
        sensors={widgetSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleWidgetDragEnd}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          {orderedIds.map((id) => (
            <DraggableWidget key={id} id={id}>
              {focusWidgetRenderers[id]()}
            </DraggableWidget>
          ))}
        </SortableContext>
      </DndContext>
    )
  }

  const renderDashboardLayout = () => (
    <>
      {renderWidget('stats_cards', renderStatCards())}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="md:w-[60%]">{renderGrid('normal')}</div>
        <div className="md:w-[40%] flex flex-col gap-6">
          {renderWidget('weekly_rings', renderRingsSection(64, true), {
            proOnly: true,
            lockedTitle: 'Anneaux hebdomadaires',
            lockedDescription: 'Débloque avec le plan Discipline+.',
          })}
          {renderWidget('chart', renderChartSection())}
          {renderWidget('category_breakdown', renderCategoryBreakdown(), {
            proOnly: true,
            lockedTitle: 'Stats par catégorie',
            lockedDescription: 'Débloque avec le plan Discipline+.',
          })}
        </div>
      </div>
      {renderWidget('advanced_stats', renderAdvancedStatsMain(), {
        proOnly: true,
        lockedTitle: 'Statistiques avancées',
        lockedDescription: 'Débloque avec le plan Discipline+.',
      })}
    </>
  )

  const renderCompactLayout = () => (
    <>
      {renderWidget('stats_cards', renderCondensedStats())}
      {renderWidget('weekly_rings', renderRingsRow(60), {
        proOnly: true,
        lockedTitle: 'Anneaux hebdomadaires',
        lockedDescription: 'Débloque avec le plan Discipline+.',
      })}
      {renderGrid('compact')}
      <div className="text-center mb-6">
        <button
          onClick={() => setCompactStatsExpanded((v) => !v)}
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
        >
          {compactStatsExpanded ? 'Masquer les stats ▲' : 'Voir les stats ▼'}
        </button>
      </div>
      {compactStatsExpanded && (
        <>
          {renderWidget('chart', renderChartSection())}
          {renderWidget('category_breakdown', renderCategoryBreakdown(), {
            proOnly: true,
            lockedTitle: 'Stats par catégorie',
            lockedDescription: 'Débloque avec le plan Discipline+.',
          })}
          {renderWidget('advanced_stats', renderAdvancedStatsMain(), {
            proOnly: true,
            lockedTitle: 'Statistiques avancées',
            lockedDescription: 'Débloque avec le plan Discipline+.',
          })}
        </>
      )}
    </>
  )

  const renderZenLayout = () => {
    const idx = Math.min(zenIndex, habitudes.length - 1)
    const goToPrevHabit = () => setZenIndex((i) => Math.max(0, i - 1))
    const goToNextHabit = () => setZenIndex((i) => Math.min(habitudes.length - 1, i + 1))

    return (
      <>
        {renderWidget('stats_cards', renderStatCards())}

        <div className="overflow-hidden rounded-lg mb-4">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${idx * 100}%)` }}
          >
            {habitudes.map((h) => (
              <div key={h.id} className="w-full shrink-0 px-1">
                {renderZenCard(h)}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between max-w-md mx-auto mb-10">
          <button
            onClick={goToPrevHabit}
            disabled={idx === 0}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md w-10 h-10 flex items-center justify-center"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5">
            {habitudes.map((h, i) => (
              <span
                key={h.id}
                className={`h-1.5 transition-[width,background-color] duration-200 ${
                  i === idx ? 'w-4 rounded-[3px] bg-[var(--accent)]' : 'w-1.5 rounded-full bg-[var(--surface-3)]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={goToNextHabit}
            disabled={idx === habitudes.length - 1}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-md w-10 h-10 flex items-center justify-center"
          >
            →
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => handleLayoutChange('focus')}
            className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] underline transition-colors"
          >
            Voir toutes mes habitudes ce mois →
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Habitudes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5" title="Disposition">
            {LAYOUT_OPTIONS.map((opt) => {
              const locked = opt.id !== 'focus' && !isPro
              return (
                <button
                  key={opt.id}
                  onClick={() => !locked && handleLayoutChange(opt.id)}
                  disabled={locked}
                  title={locked ? `${opt.label} — Pro` : opt.label}
                  className={`relative w-8 h-8 rounded-md flex items-center justify-center text-sm border transition-colors ${
                    locked
                      ? 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-subtle)] cursor-not-allowed'
                      : effectiveLayout === opt.id
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-black'
                        : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-strong)]'
                  }`}
                >
                  {opt.icon}
                  {locked && <span className="absolute -top-1 -right-1 text-[8px] leading-none">🔒</span>}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowCustomizePanel(true)}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
          >
            ⚙ Personnaliser
          </button>
          <button
            onClick={handleExport}
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
          >
            Exporter mes données 📥
          </button>
          <Link
            to="/habits/manage"
            className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
          >
            Gérer mes habitudes ✏️
          </Link>
        </div>
      </div>

      {showExportModal && (
        <Modal onClose={() => setShowExportModal(false)}>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Fonctionnalité réservée au plan Discipline+ 🔒 — Débloque l'export et
            les stats avancées.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowExportModal(false)}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-black font-bold rounded-md px-4 py-2 text-sm"
            >
              Fermer
            </button>
          </div>
        </Modal>
      )}

      {showCustomizePanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCustomizePanel(false)} />
          <div className="fixed top-0 right-0 h-full w-[280px] bg-[var(--surface-1)] border-l border-[var(--border)] z-50 p-5 overflow-y-auto momentum-panel-slide">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-base">Personnaliser mon dashboard</h2>
              <button
                onClick={() => setShowCustomizePanel(false)}
                className="text-[var(--text-faint)] hover:text-[var(--text-strong)] text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-[12px] text-[var(--text-faint)] italic mb-5">
              Survole une section pour la déplacer ⠿
            </p>

            <div className="flex flex-col gap-4">
              {WIDGET_DEFS.map((w) => {
                const locked = w.proOnly && !isPro
                const checked = !locked && widgets[w.id] !== false
                return (
                  <div key={w.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-muted)]">{w.label}</span>
                      {w.proOnly && (
                        <span className="text-[9px] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
                          Pro
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => toggleWidget(w.id)}
                      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                        locked
                          ? 'bg-[var(--surface-3)] cursor-not-allowed opacity-50'
                          : checked
                            ? 'bg-[var(--accent)]'
                            : 'bg-[var(--surface-3)]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          checked ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              onClick={resetWidgets}
              className="mt-8 w-full border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm"
            >
              Tout réafficher
            </button>
          </div>
        </>
      )}

      <div key={effectiveLayout} className="animate-[layout-fade-in_200ms_ease-out]">
        {effectiveLayout === 'dashboard'
          ? renderDashboardLayout()
          : effectiveLayout === 'compact'
            ? renderCompactLayout()
            : effectiveLayout === 'zen'
              ? renderZenLayout()
              : renderFocusLayout()}
      </div>
      </div>
    </>
  )
}
