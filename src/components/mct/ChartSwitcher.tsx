'use client'

import { Shield, CircleDashed, BarChart3 } from 'lucide-react'

export type ChartType = 'radar' | 'donut' | 'bar'

interface ChartSwitcherProps {
  current: ChartType
  onChange: (type: ChartType) => void
}

const OPTIONS: { key: ChartType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'radar', label: '雷达', icon: Shield },
  { key: 'donut', label: '环形', icon: CircleDashed },
  { key: 'bar', label: '条形', icon: BarChart3 },
]

export default function ChartSwitcher({ current, onChange }: ChartSwitcherProps) {
  return (
    <div className="sci-chart-switcher flex items-center gap-0.5 rounded-md border p-0.5">
      {OPTIONS.map((opt) => {
        const isActive = opt.key === current
        const Icon = opt.icon
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`sci-chart-btn flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
              isActive ? 'sci-chart-btn-active' : ''
            }`}
            title={opt.label + '图'}
          >
            <Icon className="h-2.5 w-2.5" />
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
