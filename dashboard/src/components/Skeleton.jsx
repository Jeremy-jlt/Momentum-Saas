// Primitives de squelette de chargement : blocs gris qui pulsent doucement,
// à composer pour approximer la forme de la page réelle (évite le saut
// visuel du "Chargement..." centré remplacé d'un coup par le contenu final).
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-[var(--surface-3)] rounded-md animate-[skeleton-pulse_1.4s_ease-in-out_infinite] ${className}`}
    />
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-3 ${className}`}
    >
      <SkeletonBlock className="h-3 w-1/3" />
      <SkeletonBlock className="h-6 w-1/2" />
      <SkeletonBlock className="h-2 w-full" />
    </div>
  )
}
