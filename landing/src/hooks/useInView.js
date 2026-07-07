import { useInView as useInViewObserver } from 'react-intersection-observer'

// Fine couche au-dessus de react-intersection-observer : déclenche une fois
// (triggerOnce) avec le threshold standard de la page (0.15), pour que
// toutes les animations d'entrée au scroll se déclenchent au même moment
// relatif sans dupliquer la config partout.
export function useInView(options = {}) {
  const { ref, inView } = useInViewObserver({
    threshold: 0.15,
    triggerOnce: true,
    ...options,
  })
  return [ref, inView]
}
