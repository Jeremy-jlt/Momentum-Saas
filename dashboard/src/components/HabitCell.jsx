import { useState } from 'react'

// Cellule standardisée pour toutes les grilles de suivi (habitudes + humeur).
// state: 'checked' | 'unchecked' | 'missed' | 'future' | 'custom'
// 'custom' laisse le fond entièrement piloté par la prop `style` (utilisé par
// la ligne d'humeur, dont la couleur dépend du score plutôt que d'un simple
// coché/non coché).
// Seule couleur verte autorisée pour une coche dans toute l'app — jamais une
// classe Tailwind (bg-emerald-*, bg-green-*), pour garantir un vert identique
// partout, y compris pour les nuances de heatmap Pro.
const CHECKED_GREEN = 'var(--accent)'
const CHECKED_GREEN_HOVER = 'var(--accent-hover)'

// Couleur des jours manqués — personnalisable (préférence "Affichage"), le
// rouge par défaut peut être perçu comme anxiogène par certains utilisateurs.
const MISSED_COLOR_CLASS = {
  rouge: 'bg-[var(--danger)] hover:bg-[var(--danger-strong)]',
  gris: 'bg-[var(--surface-3)] hover:bg-[var(--border-strong)]',
  orange: 'bg-[#c2670f] hover:bg-[#a8560a]',
}

export default function HabitCell({
  state,
  onClick,
  title,
  size = 'w-4 h-4',
  fontSize = 'text-[9px]',
  style,
  shake = false,
  missedColor = 'rouge',
}) {
  const [pressed, setPressed] = useState(false)
  const [rippling, setRippling] = useState(false)
  const [hovering, setHovering] = useState(false)

  const stateClass = {
    checked: 'text-white font-bold cursor-pointer',
    unchecked: 'bg-[var(--cell-empty)] hover:bg-[var(--cell-empty-hover)] cursor-pointer',
    missed: `${MISSED_COLOR_CLASS[missedColor] || MISSED_COLOR_CLASS.rouge} text-white cursor-pointer`,
    future: 'bg-[var(--cell-future)] opacity-40 cursor-not-allowed',
    custom: 'text-white cursor-pointer',
  }[state]

  // Le fond coché passe par une couleur inline (vert plat ou nuance de
  // heatmap Pro) : une classe Tailwind hover: ne peut pas la surpasser
  // (spécificité), donc le survol est géré ici en JS.
  const background =
    state === 'checked'
      ? hovering
        ? CHECKED_GREEN_HOVER
        : style?.background || CHECKED_GREEN
      : style?.background

  const computedStyle = { ...style, background }

  const content = state === 'checked' ? '✓' : state === 'missed' ? '—' : ''

  const handleClick = (e) => {
    if (state === 'future') return

    setPressed(true)
    setTimeout(() => setPressed(false), 80)

    // Ripple uniquement quand la cellule passe à l'état coché (pas au décochage).
    if (state === 'unchecked' || state === 'missed') {
      setRippling(true)
      setTimeout(() => setRippling(false), 400)
    }

    onClick?.(e)
  }

  return (
    <button
      type="button"
      disabled={state === 'future'}
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      title={title}
      style={computedStyle}
      className={`group relative ${size} rounded flex items-center justify-center mx-auto ${fontSize} transition-[background-color,transform] duration-100 ${stateClass} ${
        pressed ? 'scale-[0.85]' : 'scale-100'
      } ${shake ? 'animate-[shake_300ms_ease-in-out]' : ''}`}
    >
      {rippling && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'var(--accent)', animation: 'ripple 400ms ease-out forwards' }}
        />
      )}
      {content}
    </button>
  )
}
