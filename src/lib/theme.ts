import { useEffect, useState } from 'react'

export type Theme = 'auto' | 'claro' | 'oscuro'
const KEY = 'basto-gym:theme'
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Automático' },
  { id: 'claro', label: 'Claro' },
  { id: 'oscuro', label: 'Oscuro' },
]

export function readTheme(): Theme {
  try { const v = localStorage.getItem(KEY); if (v === 'claro' || v === 'oscuro') return v } catch { /* sin almacenamiento */ }
  return 'auto'
}

/** Aplica el tema al documento. "auto" deja que mande el teléfono (prefers-color-scheme). */
export function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t === 'claro' ? 'light' : 'dark')
  const light = t === 'claro' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f3f2ee' : '#0a0a0b')
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setT] = useState<Theme>(readTheme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const on = () => applyTheme('auto')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])
  const set = (t: Theme) => {
    try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t) } catch { /* sin almacenamiento */ }
    setT(t)
    window.dispatchEvent(new Event('basto-theme'))
  }
  useEffect(() => {
    const on = () => setT(readTheme())
    window.addEventListener('basto-theme', on)
    return () => window.removeEventListener('basto-theme', on)
  }, [])
  return [theme, set]
}
