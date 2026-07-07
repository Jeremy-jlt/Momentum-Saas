import { useEffect, useRef, useState } from 'react'

// Anime une valeur numérique de 0 (ou de sa dernière valeur stabilisée) vers
// `targetValue` avec un easing cubique. Rejoue au montage (donc à chaque
// apparition du composant qui l'utilise) et à chaque changement de cible.
export function useCountUp(targetValue, duration = 600) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = targetValue ?? 0
    const start = performance.now()
    let raf

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (to - from) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [targetValue, duration])

  return value
}
