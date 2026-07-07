import { useEffect, useState } from 'react'

const STORAGE_KEY = 'momentum_display_prefs'

export const DEFAULT_DISPLAY_PREFS = {
  density: 'confortable',
  missedColor: 'rouge',
  showFutureDays: true,
  checkSound: false,
}

function getInitial() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored ? { ...DEFAULT_DISPLAY_PREFS, ...stored } : DEFAULT_DISPLAY_PREFS
  } catch {
    return DEFAULT_DISPLAY_PREFS
  }
}

export function useDisplayPrefs() {
  const [prefs, setPrefs] = useState(getInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }))

  return [prefs, setPref]
}

// Bip court (~800Hz, 50ms) via Web Audio — pas de fichier audio à charger.
export function playCheckSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 800
    gain.gain.value = 0.08
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.05)
    oscillator.onended = () => ctx.close()
  } catch {
    // API Web Audio indisponible (navigateur ancien) — silencieux, pas de crash.
  }
}
