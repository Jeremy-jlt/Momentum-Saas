import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(undefined)

const STORAGE_KEY = 'momentum-theme'

export const THEMES = [
  { id: 'obsidian', label: 'Obsidian', bg: '#060608', accent: '#10b981' },
  { id: 'void-blue', label: 'Void Blue', bg: '#02040f', accent: '#60a5fa' },
  { id: 'ember', label: 'Ember', bg: '#0a0603', accent: '#f97316' },
  { id: 'amethyst', label: 'Amethyst', bg: '#050309', accent: '#a78bfa' },
  { id: 'ivory', label: 'Ivory', bg: '#fbfbfa', accent: '#10b981' },
]

const THEME_COLOR = Object.fromEntries(THEMES.map((t) => [t.id, t.bg]))

// 'dark'/'light' sont les anciens identifiants de thème (avant le passage à
// 5 thèmes) — migrés vers leurs équivalents les plus proches pour ne pas
// perdre la préférence déjà enregistrée des utilisateurs existants.
const LEGACY_MIGRATION = { dark: 'obsidian', light: 'ivory' }

function getInitialTheme() {
  if (typeof window === 'undefined') return 'obsidian'
  const stored = localStorage.getItem(STORAGE_KEY)
  const migrated = LEGACY_MIGRATION[stored] ?? stored
  return THEMES.some((t) => t.id === migrated) ? migrated : 'obsidian'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLOR[theme])
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'ivory' ? 'obsidian' : 'ivory'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (ctx === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
