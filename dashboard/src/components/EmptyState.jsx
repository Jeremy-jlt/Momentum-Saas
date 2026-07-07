import { Link } from 'react-router-dom'

// Illustrations géométriques abstraites, une par contexte, dans les couleurs
// Momentum (vert accent + gris de surface) — pas d'icône générique de stock.

export function EngagementsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="46" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="32" stroke="var(--border-strong)" strokeWidth="1.5" />
      <path
        d="M60 28a32 32 0 0 1 32 32"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="60" cy="60" r="5" fill="var(--accent)" />
      <circle cx="92" cy="60" r="3" fill="var(--accent)" />
    </svg>
  )
}

export function HabitsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={24 + i * 20}
          y={70 - i * 12}
          width="14"
          height={14 + i * 12}
          rx="3"
          fill={i === 3 ? 'var(--accent)' : 'var(--surface-3)'}
          stroke={i === 3 ? 'var(--accent)' : 'var(--border)'}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function ProjectsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="24" y="30" width="40" height="40" rx="6" stroke="var(--border)" strokeWidth="1.5" />
      <rect
        x="56"
        y="50"
        width="40"
        height="40"
        rx="6"
        fill="var(--accent)"
        fillOpacity="0.08"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <circle cx="44" cy="50" r="3" fill="var(--border-strong)" />
      <circle cx="76" cy="70" r="3" fill="var(--accent)" />
    </svg>
  )
}

export function SessionsIllustration() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="34" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M50 30v20l14 8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function EmptyState({ illustration, title, description, ctaLabel, ctaTo, onCta }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="mb-6 flex justify-center">{illustration}</div>
      <h2 className="text-heading mb-2">{title}</h2>
      {description && <p className="text-body max-w-sm mx-auto mb-8">{description}</p>}
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && !ctaTo && (
        <button
          onClick={onCta}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
