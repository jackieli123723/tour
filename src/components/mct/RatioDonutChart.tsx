'use client'

import { useMemo, useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

interface RatioDonutChartProps {
  provinces: { province: number; name: string; count: number }[]
  color: string
}

// 10 个高对比度配色（与各数据集主题色协调）
const PALETTE = [
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#facc15', '#84cc16', '#10b981', '#14b8a6',
]

export default function RatioDonutChart({ provinces, color }: RatioDonutChartProps) {
  const [isLight, setIsLight] = useState(false)

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

  const { top10, total } = useMemo(() => {
    const sorted = [...provinces].sort((a, b) => b.count - a.count).slice(0, 10)
    return {
      top10: sorted,
      total: sorted.reduce((s, p) => s + p.count, 0),
    }
  }, [provinces])

  if (top10.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs sci-t-muted">
        暂无数据
      </div>
    )
  }

  const leader = top10[0]

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 10, 24, 0.95)',
      borderColor: isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(56, 189, 248, 0.4)',
      borderWidth: 1,
      textStyle: { color: isLight ? '#0f172a' : '#e2e8f0', fontSize: 12 },
      padding: [8, 12],
      extraCssText: `box-shadow: 0 0 20px ${isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(56, 189, 248, 0.3)'}; backdrop-filter: blur(8px); border-radius: 4px;`,
      formatter: (params: any) => {
        const pct = ((params.value / total) * 100).toFixed(1)
        return `<div style="font-weight:600;color:${params.color}">${params.name}</div>
                <div style="margin-top:2px;color:${isLight ? '#475569' : '#94a3b8'};font-size:11px">
                  <span style="font-family:monospace;font-weight:700;color:${isLight ? '#0f172a' : '#fff'};font-size:13px">${params.value}</span> 条 ·
                  占比 <span style="font-family:monospace;color:${params.color};font-weight:700">${pct}%</span>
                </div>`
      },
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      textStyle: {
        color: isLight ? '#475569' : '#cbd5e1',
        fontSize: 10,
        rich: {
          pct: {
            color: isLight ? '#0891b2' : '#22d3ee',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 10,
          },
        },
      },
      formatter: (name: string) => {
        const item = top10.find((p) => p.name === name)
        if (!item) return name
        const pct = ((item.count / total) * 100).toFixed(1)
        return `${name} {pct|${pct}%}`
      },
      data: top10.map((p) => p.name),
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: isLight ? '#fff' : '#0a1428',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        data: top10.map((p, i) => ({
          name: p.name,
          value: p.count,
          itemStyle: {
            color: PALETTE[i % PALETTE.length],
          },
        })),
      },
    ],
    // 中心文字：三行围绕环心(center y=42%)垂直对称排布
    // 数字行精确对齐环心(42%)，上下行按 30% / 54% 对称分布
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '30%',
        style: {
          text: 'TOP10 合计',
          textAlign: 'center',
          textVerticalAlign: 'middle',
          fill: isLight ? '#64748b' : '#94a3b8',
          fontSize: 10,
        },
        z: 10,
      },
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: String(total),
          textAlign: 'center',
          textVerticalAlign: 'middle',
          fill: color,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: 'monospace',
        },
        z: 10,
      },
      {
        type: 'text',
        left: 'center',
        top: '54%',
        style: {
          text: `${leader.name} 领跑`,
          textAlign: 'center',
          textVerticalAlign: 'middle',
          fill: isLight ? '#475569' : '#cbd5e1',
          fontSize: 10,
        },
        z: 10,
      },
    ],
  }

  // 与 series 中心对齐：series center 是 ['50%', '52%']
  // graphic 的 left: 'center' 会自动水平居中
  const optionWithCenter = option

  return (
    <ReactECharts
      option={optionWithCenter}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
    />
  )
}
