// Cellule standardisée pour toutes les grilles de suivi (habitudes + humeur).
// state: 'checked' | 'unchecked' | 'missed' | 'future' | 'custom'
// 'custom' laisse le fond entièrement piloté par la prop `style` (utilisé par
// la ligne d'humeur, dont la couleur dépend du score plutôt que d'un simple
// coché/non coché).
// Seule couleur verte autorisée pour une coche dans toute l'app — jamais une
// classe Tailwind (bg-emerald-*, bg-green-*), pour garantir un vert identique
// partout, y compris pour les nuances de heatmap Pro.
const CHECKED_GREEN = '#10b981'

export default function HabitCell({
  state,
  onClick,
  title,
  size = 'w-4 h-4',
  fontSize = 'text-[9px]',
  style,
}) {
  const stateClass = {
    checked: 'text-white font-bold',
    unchecked: 'bg-[#1f2937] hover:bg-[#374151]',
    missed: 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white',
    future: 'bg-[#111827] opacity-40 cursor-not-allowed',
    custom: 'text-white',
  }[state]

  // `style` (ex: intensité de heatmap Pro) prévaut toujours sur le vert par défaut.
  const computedStyle = state === 'checked' ? { background: CHECKED_GREEN, ...style } : style

  const content = state === 'checked' ? '✓' : state === 'missed' ? '—' : ''

  return (
    <button
      type="button"
      disabled={state === 'future'}
      onClick={onClick}
      title={title}
      style={computedStyle}
      className={`group relative ${size} rounded flex items-center justify-center mx-auto ${fontSize} transition-colors ${stateClass}`}
    >
      {content}
    </button>
  )
}
