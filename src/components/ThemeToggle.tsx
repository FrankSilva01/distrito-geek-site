import { Moon, Sun } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const initialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem('dg-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  const next = theme === 'dark' ? 'light' : 'dark'
  return <button className="theme-toggle" type="button" aria-label={`Ativar tema ${next === 'light' ? 'claro' : 'escuro'}`} onClick={() => {
    document.documentElement.dataset.theme = next
    window.localStorage.setItem('dg-theme', next)
    setTheme(next)
  }}>{theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
}
