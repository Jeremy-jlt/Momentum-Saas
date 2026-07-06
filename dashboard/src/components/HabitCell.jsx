import { useState } from 'react'

// Cellule standardisée pour toutes les grilles de suivi (habitudes + humeur).
// state: 'checked' | 'unchecked' | 'missed' | 'future' | 'custom'
// 'custom' laisse le fond entièrement piloté par la prop `style` (utilisé par
// la ligne d'humeur, dont la couleur dépend du score plutôt que d'un simple
// coché/non coché).
// Seule couleur verte autorisée pour une coche dans toute l'app — jamais une
// classe Tailwind (bg-emerald-*, bg-green-*), pour garantir un vert identique
// partout, y compris pour les nuances de heatmap Pro.
const CHECKED_GREEN = '#10b981'
const CHECKED_GREEN_HOVER = '#0d9368'

export default function HabitCell({
  state,
  onClick,
  title,
  size = 'w-4 h-4',
  fontSize = 'text-[9px]',
  style,
  shake = false,
}) {
  const [pressed, setPressed] = useState(false)
  const [rippling, setRippling] = useState(false)
  const [hovering, setHovering] = useState(false)

  const stateClass = {
    checked: 'text-white font-bold cursor-pointer',
    unchecked: 'bg-[#1f2937] hover:bg-[#2a2a2a] cursor-pointer',
    missed: 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white cursor-pointer',
    future: 'bg-[#111827] opacity-40 cursor-not-allowed',
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
          style={{ background: '#10b981', animation: 'ripple 400ms ease-out forwards' }}
        />
      )}
      {content}
    </button>
  )
}
