import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from './Toast'

function buildActions({ navigate, toggleTheme, showToast, user }) {
  if (!user) return []
  return [
    { id: 'new-engagement', group: 'Actions', icon: '🎯', label: 'Nouvel engagement', run: () => navigate('/new') },
    { id: 'new-habit', group: 'Actions', icon: '✓', label: 'Nouvelle habitude', run: () => navigate('/habits/manage') },
    {
      id: 'new-project',
      group: 'Actions',
      icon: '📁',
      label: 'Nouveau projet',
      run: () => navigate('/projects?create=1'),
    },
    {
      id: 'start-session',
      group: 'Actions',
      icon: '⏱',
      label: 'Démarrer une session',
      run: () => showToast("Lance une session bloquée depuis l'extension Momentum.", 'success'),
    },
    {
      id: 'export',
      group: 'Actions',
      icon: '⬇',
      label: 'Exporter mes données (Pro)',
      run: () => navigate('/profile'),
    },
    { id: 'theme', group: 'Actions', icon: '◐', label: 'Changer de thème', run: () => toggleTheme() },
    { id: 'go-home', group: 'Navigation', icon: '→', label: 'Aller sur Accueil', run: () => navigate('/') },
    {
      id: 'go-engagements',
      group: 'Navigation',
      icon: '→',
      label: 'Aller sur Engagements',
      run: () => navigate('/engagements'),
    },
    { id: 'go-habits', group: 'Navigation', icon: '→', label: 'Aller sur Habitudes', run: () => navigate('/habits') },
    { id: 'go-projects', group: 'Navigation', icon: '→', label: 'Aller sur Projets', run: () => navigate('/projects') },
    { id: 'go-profile', group: 'Navigation', icon: '→', label: 'Aller sur Profil', run: () => navigate('/profile') },
  ]
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toggleTheme } = useTheme()
  const showToast = useToast()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const actions = useMemo(
    () => buildActions({ navigate, toggleTheme, showToast, user }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter((a) => a.label.toLowerCase().includes(q))
  }, [actions, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const runAction = (action) => {
    onClose()
    action.run()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) runAction(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = null

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-[560px] palette-glass border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl animate-[palette-in_150ms_ease-out]"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher..."
          aria-label="Rechercher une action"
          className="w-full bg-transparent px-5 py-4 text-base text-[var(--text-strong)] placeholder:text-[var(--text-subtle)] focus:outline-none border-b border-[var(--border)]"
        />
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-5 py-6 text-sm text-[var(--text-faint)] text-center">Aucun résultat.</p>
          )}
          {filtered.map((action, i) => {
            const showGroupLabel = action.group !== lastGroup
            lastGroup = action.group
            return (
              <div key={action.id}>
                {showGroupLabel && <p className="text-label px-5 pt-3 pb-1">{action.group}</p>}
                <button
                  onClick={() => runAction(action)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-5 h-9 text-sm text-left transition-colors border-l-2 ${
                    i === activeIndex
                      ? 'bg-[var(--surface-3)] border-[var(--accent)] text-[var(--text-strong)]'
                      : 'border-transparent text-[var(--text-muted)]'
                  }`}
                >
                  <span className="w-4 text-center shrink-0">{action.icon}</span>
                  {action.label}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
