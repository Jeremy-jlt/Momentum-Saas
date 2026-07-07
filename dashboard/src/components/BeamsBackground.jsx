// Fond ambiant léger : deux nappes lumineuses (couleur d'accent du thème
// actif) qui dérivent très lentement en CSS pur. Remplace l'ancienne version
// à base de canvas (18 faisceaux redessinés à chaque frame avec un flou
// recalculé en continu) qui pesait sur les performances sans bénéfice
// perceptible — l'animation CSS transform+filter ci-dessous est composée par
// le GPU, sans travail JS récurrent, tout en gardant l'identité visuelle
// (halo émeraude/accent qui respire) du design d'origine.
export default function BeamsBackground({ className = '', fixed = false, children }) {
  const wrapperClass = fixed
    ? `fixed inset-0 overflow-hidden pointer-events-none bg-[var(--surface-0)] ${className}`
    : `relative overflow-hidden bg-[var(--surface-0)] ${className}`

  return (
    <div className={wrapperClass} aria-hidden={fixed ? 'true' : undefined}>
      <div className="ambient-glow" style={{ top: '-15%', left: '-10%' }} aria-hidden="true" />
      <div
        className="ambient-glow"
        style={{ bottom: '-20%', right: '-10%', animationDelay: '-12s' }}
        aria-hidden="true"
      />
      {!fixed && <div className="relative z-10 w-full">{children}</div>}
    </div>
  )
}
