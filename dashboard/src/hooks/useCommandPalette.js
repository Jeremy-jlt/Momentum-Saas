import { useEffect, useState } from 'react'

// Ctrl/Cmd+K bascule l'ouverture depuis n'importe où dans l'app ; Escape est
// géré ici en plus du composant lui-même pour fermer même si le focus n'est
// pas dans le champ de recherche.
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}
