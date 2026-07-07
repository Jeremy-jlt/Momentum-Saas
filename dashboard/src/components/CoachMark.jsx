import { useEffect, useState } from 'react'

const STORAGE_PREFIX = 'momentum_coachmark_'

// Highlight pulsant + bulle de texte pointant vers `targetRef`, affiché une
// seule fois par utilisateur (persisté en localStorage) puis jamais revu
// une fois "Compris" cliqué.
export default function CoachMark({ id, targetRef, message, position = 'bottom', onDismiss }) {
  const [rect, setRect] = useState(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_PREFIX + id)) {
      // Déjà vu lors d'une session précédente : on ne l'affiche pas, mais on
      // prévient le parent pour qu'il puisse enchaîner sur le coach mark
      // suivant d'une séquence sans attendre un clic qui n'arrivera jamais.
      onDismiss?.()
      return
    }
    if (!targetRef.current) return

    const update = () => {
      if (targetRef.current) setRect(targetRef.current.getBoundingClientRect())
    }
    update()
    setDismissed(false)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (dismissed || !rect) return null

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_PREFIX + id, '1')
    setDismissed(true)
    onDismiss?.()
  }

  const bubbleTop = position === 'bottom' ? rect.bottom + 10 : rect.top - 10
  const bubbleLeft = Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140)

  return (
    <>
      <div
        className="fixed z-[250] rounded-md pointer-events-none animate-[coachmark-pulse_1.6s_ease-in-out_infinite]"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          border: '2px solid var(--accent)',
        }}
      />
      <div
        className="fixed z-[250] w-64 card-glass border border-[var(--border)] rounded-lg p-4 shadow-2xl animate-[tooltip-in_150ms_ease-out]"
        style={{
          top: bubbleTop,
          left: bubbleLeft,
          transform: position === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        }}
      >
        <p className="text-sm text-[var(--text-strong)] mb-3">{message}</p>
        <button
          onClick={handleDismiss}
          className="text-xs bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] font-bold rounded-md px-3 py-1.5 transition-colors"
        >
          Compris ✓
        </button>
      </div>
    </>
  )
}
