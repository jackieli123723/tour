'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TrendChartProps {
  provinces: { province: number; name: string; count: number }[]
  color: string
}

interface ChartDatum {
  name: string
  count: number
  rank: number
}

export default function TrendChart({ provinces, color }: TrendChartProps) {
  const [isLight, setIsLight] = useState(false)

  // 监听主题
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  const data: ChartDatum[] = useMemo(() => {
    return [...provinces]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p, i) => ({
        name: p.name,
        count: p.count,
        rank: i + 1,
      }))
      .reverse()
  }, [provinces])

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 1
  const xMax = Math.max(5, Math.ceil(maxCount / 5) * 5)

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500">
        暂无数据
      </div>
    )
  }

  // 主题相关颜色
  const axisColor = isLight ? '#94a3b8' : '#64748b'
  const labelColor = isLight ? '#475569' : '#cbd5e1'
  const axisLineColor = isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(56, 189, 248, 0.15)'
  const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 10, 24, 0.95)'
  const tooltipBorder = isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(56, 189, 248, 0.4)'
  const tooltipTextColor = isLight ? '#0f172a' : '#e2e8f0'
  const tooltipLabelColor = isLight ? '#64748b' : '#94a3b8'
  const cursorColor = isLight ? 'rgba(59, 130, 246, 0.06)' : 'rgba(56, 189, 248, 0.06)'

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 2, right: 24, left: 4, bottom: 2 }}
        barCategoryGap="18%"
      >
        <defs>
          <linearGradient id="trendBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
          <filter id="trendBarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <XAxis
          type="number"
          domain={[0, xMax]}
          hide
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: labelColor }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          cursor={{ fill: cursorColor }}
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 4,
            fontSize: 12,
            color: tooltipTextColor,
            boxShadow: `0 0 20px ${isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(56, 189, 248, 0.3)'}`,
            backdropFilter: 'blur(8px)',
          }}
          labelStyle={{ color: tooltipLabelColor, fontWeight: 500 }}
          formatter={(value: number, _name, item: any) => {
            const rank = item?.payload?.rank
            return [
              <span key="v" style={{ color, fontFamily: 'monospace', fontWeight: 700 }}>
                {value}
              </span>,
              `TOP${rank} 数量`,
            ]
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 3, 3, 0]}
          fill="url(#trendBarGradient)"
          filter="url(#trendBarGlow)"
          label={{
            position: 'right',
            fill: color,
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 700,
            formatter: (v: any) => v,
          }}
        >
          {data.map((d, i) => {
            const opacity = 0.5 + (i / Math.max(1, data.length - 1)) * 0.5
            return <Cell key={`cell-${i}`} fill={color} fillOpacity={opacity} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
