import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Enveloppe une section de la page Habitudes pour la rendre réorganisable.
// N'affecte pas le contenu qu'il enveloppe : le bouton × de masquage d'un
// widget (rendu par renderWidget) et son propre hover restent intacts —
// cette poignée vit dans un groupe Tailwind nommé (group/widget) pour ne
// jamais interférer avec le hover interne du contenu enveloppé.
export default function DraggableWidget({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/widget relative ${isDragging ? 'z-30 opacity-60 rounded-lg' : ''}`}
    >
      {isDragging && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ boxShadow: '0 0 0 2px var(--accent)' }}
        />
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none', padding: '4px 6px' }}
        className="absolute top-2 left-2 z-20 rounded bg-[var(--surface-1)] border border-[var(--border-strong)] text-[var(--text-faint)] text-sm leading-none cursor-grab active:cursor-grabbing opacity-0 group-hover/widget:opacity-100 transition-opacity"
        aria-label="Réorganiser cette section"
      >
        ⠿
      </button>

      {children}
    </div>
  )
}
