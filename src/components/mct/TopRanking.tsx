'use client'

import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

interface TopRankingProps {
  provinces: { province: number; name: string; count: number }[]
  color: string
  onSelect?: (provinceName: string) => void
  selected?: string | null
  total: number
}

export default function TopRanking({ provinces, color, onSelect, selected }: TopRankingProps) {
  const top = [...provinces].sort((a, b) => b.count - a.count).slice(0, 15)
  const maxCount = top[0]?.count || 1

  return (
    <div className="flex h-full flex-col">
      <div className="sci-scroll flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {top.map((p, i) => {
          const isSelected = selected === p.name
          const widthPct = (p.count / maxCount) * 100
          // 排名前三用金/银/铜色，其它用主题色
          const rankBg =
            i === 0
              ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950'
              : i === 1
              ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900'
              : i === 2
              ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950'
              : 'sci-subcard sci-t-tertiary'
          return (
            <button
              key={p.province}
              type="button"
              onClick={() => onSelect?.(p.name)}
              className={`group relative flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left transition-all border ${
                isSelected ? 'sci-subcard' : 'border-transparent sci-hover-soft'
              }`}
            >
              {/* 排名徽章 */}
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${rankBg}`}
              >
                {i < 3 ? <Crown className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {/* 省份名称 */}
              <span className={`w-12 flex-shrink-0 text-[12px] truncate ${isSelected ? 'sci-t-active font-semibold' : 'sci-t-secondary'}`}>
                {p.name}
              </span>
              {/* 数据条 */}
              <div className="sci-bar-track flex-1 relative h-4 overflow-hidden rounded-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    background: `linear-gradient(90deg, ${color}30 0%, ${color} 100%)`,
                    boxShadow: `0 0 8px ${color}80`,
                    opacity: isSelected ? 1 : 0.85,
                  }}
                />
                {/* 进度条扫描高光 */}
                <div
                  className="absolute inset-y-0 right-0 w-px"
                  style={{ background: color, boxShadow: `0 0 4px ${color}`, opacity: widthPct > 5 ? 1 : 0 }}
                />
              </div>
              {/* 数值 */}
              <span
                className={`w-9 text-right sci-number text-[12px] font-bold ${i < 3 ? '' : 'sci-t-secondary'}`}
                style={i < 3 ? { color } : undefined}
              >
                {p.count}
              </span>
            </button>
          )
        })}
        {top.length === 0 && (
          <div className="py-8 text-center text-xs sci-t-muted">暂无数据</div>
        )}
      </div>
    </div>
  )
}
