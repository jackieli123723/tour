'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 避免水合不匹配
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-600/30"
        aria-label="切换主题"
      >
        <Moon className="h-3.5 w-3.5 text-slate-400" />
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-8 w-8 items-center justify-center rounded-md border transition-all ${
        isDark
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
      }`}
      aria-label={isDark ? '切换到亮色主题' : '切换到暗色主题'}
      title={isDark ? '切换到亮色主题' : '切换到暗色主题'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-3.5 w-3.5" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
