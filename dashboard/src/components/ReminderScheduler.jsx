import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCached } from '../utils/dataCache'
import { toISODate } from '../utils/dateUtils'
import { useReminderPrefs } from '../hooks/useReminderPrefs'

// LIMITE CONNUE : l'API Notification + un composant React ne peuvent PAS
// réveiller l'utilisateur à une heure précise si l'onglet/l'app est fermé —
// cela nécessiterait un vrai serveur de push (Web Push + VAPID + cron
// côté backend). Sans ça, ce composant ne peut faire du "best-effort" que
// pendant que l'onglet Momentum est ouvert (même en arrière-plan) : il
// vérifie chaque minute si l'heure configurée est atteinte.
const CHECK_INTERVAL_MS = 60_000

function alreadyNotifiedTodayKey(dateISO) {
  return `momentum_reminder_sent_${dateISO}`
}

export default function ReminderScheduler() {
  const { user } = useAuth()
  const [prefs] = useReminderPrefs()

  useEffect(() => {
    if (!user || !prefs.enabled) return
    if (typeof Notification === 'undefined') return

    const check = () => {
      if (Notification.permission !== 'granted') return

      const now = new Date()
      const todayISO = toISODate(now)
      if (localStorage.getItem(alreadyNotifiedTodayKey(todayISO))) return
      if (!prefs.days.includes(now.getDay())) return

      const [h, m] = prefs.time.split(':').map(Number)
      if (now.getHours() !== h || now.getMinutes() !== m) return

      const cached = getCached(`habits:${user.id}`)
      if (!cached) return

      const total = cached.habitudes?.length ?? 0
      const doneToday = new Set(
        (cached.completions ?? []).filter((c) => c.date === todayISO).map((c) => c.habitude_id)
      ).size

      if (total > 0 && doneToday === 0) {
        new Notification('Momentum', {
          body: `${total} habitude${total > 1 ? 's' : ''} t'attendent aujourd'hui 🔥`,
          icon: '/favicon.svg',
        })
      }
      localStorage.setItem(alreadyNotifiedTodayKey(todayISO), '1')
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [user, prefs])

  return null
}
