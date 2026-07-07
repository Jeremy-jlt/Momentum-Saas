import { useRef, useState } from 'react'

const POSITION_STYLES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

// Tooltip universel : n'apparaît qu'après `delay` ms de survol (évite le
// bruit visuel au simple passage de la souris) mais disparaît instantanément
// au hover-out, comme les tooltips natifs des interfaces soignées.
export default function Tooltip({ children, content, delay = 600, position = 'top' }) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef(null)

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay)
  }

  const handleLeave = () => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  if (!content) return children

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap max-w-[200px] text-[11px] text-[var(--text-muted)] bg-[var(--surface-1)] border-[0.5px] border-[var(--border)] rounded-md px-2.5 py-1.5 animate-[tooltip-in_150ms_ease-out] ${POSITION_STYLES[position]}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
