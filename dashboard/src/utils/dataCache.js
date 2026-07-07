// Cache mémoire minimal, partagé entre les montages de composants (survit à
// la navigation React Router puisque les pages sont démontées/remontées à
// chaque changement de route, mais ce module reste chargé). Permet un
// pattern "stale-while-revalidate" simple : au remontage d'une page déjà
// visitée, on affiche instantanément les dernières données connues pendant
// qu'on revalide en arrière-plan, au lieu de réafficher un écran de
// chargement à chaque navigation. Réinitialisé au rechargement complet de
// la page (pas de persistance disque — ce n'est pas son rôle).
const cache = new Map()

export function getCached(key) {
  return cache.get(key)
}

export function setCached(key, value) {
  cache.set(key, value)
}
