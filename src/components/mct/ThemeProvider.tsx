'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

const STORAGE_KEY = 'mct-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // 初始化：URL 参数 ?theme= > localStorage > 默认 dark
  useEffect(() => {
    const urlTheme = typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('theme') as Theme | null)
      : null
    if (urlTheme === 'light' || urlTheme === 'dark') {
      localStorage.setItem(STORAGE_KEY, urlTheme)
      requestAnimationFrame(() => setThemeState(urlTheme))
    } else {
      const saved = (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null) as Theme | null
      if (saved === 'light' || saved === 'dark') {
        requestAnimationFrame(() => setThemeState(saved))
      }
    }
    requestAnimationFrame(() => setMounted(true))
  }, [])

  // 同步到 <html> 的 class 和 localStorage
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, mounted])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
