'use client'

import { useMemo, useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([RadarChart, TooltipComponent, LegendComponent, CanvasRenderer])

interface TopRadarChartProps {
  provinces: { province: number; name: string; count: number }[]
  color: string
}

export default function TopRadarChart({ provinces, color }: TopRadarChartProps) {
  const [isLight, setIsLight] = useState(false)

  // 监听主题变化
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

  const { top10, maxCount } = useMemo(() => {
    const sorted = [...provinces].sort((a, b) => b.count - a.count).slice(0, 10)
    return {
      top10: sorted,
      maxCount: sorted[0]?.count || 1,
    }
  }, [provinces])

  if (top10.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs sci-t-muted">
        暂无数据
      </div>
    )
  }

  // 数值归一化到榜首=100
  const normalizedData = top10.map((p) => ({
    name: p.name,
    value: Math.round((p.count / maxCount) * 100),
    rawCount: p.count,
    percent: ((p.count / maxCount) * 100).toFixed(1),
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 10, 24, 0.95)',
      borderColor: isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(56, 189, 248, 0.4)',
      borderWidth: 1,
      textStyle: { color: isLight ? '#0f172a' : '#e2e8f0', fontSize: 12 },
      padding: [8, 12],
      extraCssText: `box-shadow: 0 0 20px ${isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(56, 189, 248, 0.3)'}; backdrop-filter: blur(8px); border-radius: 4px;`,
      formatter: () => {
        const rows = normalizedData
          .map(
            (d) =>
              `<tr><td style="padding:2px 8px 2px 0;color:${isLight ? '#475569' : '#94a3b8'}">${d.name}</td><td style="text-align:right;font-family:monospace;font-weight:700;color:${color}">${d.rawCount}</td><td style="text-align:right;font-family:monospace;color:${isLight ? '#64748b' : '#94a3b8'};padding-left:6px">${d.percent}%</td></tr>`,
          )
          .join('')
        return `<div style="font-weight:600;margin-bottom:4px;color:${isLight ? '#0f172a' : '#fff'}">TOP10 占榜首比例</div><table>${rows}</table>`
      },
    },
    radar: {
      indicator: normalizedData.map((d) => ({
        name: d.name,
        max: 100,
      })),
      shape: 'polygon',
      splitNumber: 5,
      center: ['50%', '52%'],
      radius: '62%',
      axisName: {
        color: isLight ? '#475569' : '#cbd5e1',
        fontSize: 10,
        fontWeight: 500,
      },
      axisLine: {
        lineStyle: {
          color: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(56, 189, 248, 0.15)',
        },
      },
      splitLine: {
        lineStyle: {
          color: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(56, 189, 248, 0.2)',
          type: 'dashed' as const,
        },
      },
      splitArea: {
        show: false,
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: normalizedData.map((d) => d.value),
            name: 'TOP10',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: {
              color,
              width: 2,
              shadowColor: color,
              shadowBlur: 8,
            },
            itemStyle: {
              color,
              borderColor: '#fff',
              borderWidth: 1,
            },
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
                { offset: 0, color: `${color}10` },
                { offset: 1, color: `${color}50` },
              ]),
            },
          },
        ],
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={true}
    />
  )
}
