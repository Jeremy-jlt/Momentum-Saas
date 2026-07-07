import { useEffect, useState } from 'react'

const STORAGE_KEY = 'momentum_reminder_prefs'

// Jours au format JS Date.getDay() : 0 = dimanche ... 6 = samedi.
export const DEFAULT_REMINDER_PREFS = {
  enabled: false,
  time: '20:00',
  days: [1, 2, 3, 4, 5, 6, 0],
}

function getInitial() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored ? { ...DEFAULT_REMINDER_PREFS, ...stored } : DEFAULT_REMINDER_PREFS
  } catch {
    return DEFAULT_REMINDER_PREFS
  }
}

export function useReminderPrefs() {
  const [prefs, setPrefs] = useState(getInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }))

  return [prefs, setPref]
}
