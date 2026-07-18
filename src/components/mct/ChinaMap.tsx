'use client'

import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { MapChart } from 'echarts/charts'
import {
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ProvinceStat } from '@/lib/mct/fetcher'

echarts.use([
  MapChart,
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
  CanvasRenderer,
])

interface ChinaMapProps {
  provinces: ProvinceStat[]
  typeName: string
  color: string
  onSelectProvince?: (provinceName: string | null) => void
  highlightedProvince?: string | null
}

function normalizeProvinceName(name: string): string {
  if (!name) return ''
  if (name === '兵团') return '新疆维吾尔自治区'
  const map: Record<string, string> = {
    北京: '北京市',
    天津: '天津市',
    上海: '上海市',
    重庆: '重庆市',
    内蒙古: '内蒙古自治区',
    广西: '广西壮族自治区',
    西藏: '西藏自治区',
    宁夏: '宁夏回族自治区',
    新疆: '新疆维吾尔自治区',
    河北: '河北省',
    山西: '山西省',
    辽宁: '辽宁省',
    吉林: '吉林省',
    黑龙江: '黑龙江省',
    江苏: '江苏省',
    浙江: '浙江省',
    安徽: '安徽省',
    福建: '福建省',
    江西: '江西省',
    山东: '山东省',
    河南: '河南省',
    湖北: '湖北省',
    湖南: '湖南省',
    广东: '广东省',
    海南: '海南省',
    四川: '四川省',
    贵州: '贵州省',
    云南: '云南省',
    陕西: '陕西省',
    甘肃: '甘肃省',
    青海: '青海省',
    台湾: '台湾省',
    香港: '香港特别行政区',
    澳门: '澳门特别行政区',
  }
  return map[name] || name
}

let _chinaGeoLoaded: Promise<void> | null = null

function ensureChinaGeo(): Promise<void> {
  if (_chinaGeoLoaded) return _chinaGeoLoaded
  _chinaGeoLoaded = (async () => {
    const res = await fetch('/geo/china.json')
    const geo = await res.json()
    geo.features = geo.features.filter((f: any) => f.properties && f.properties.name)
    echarts.registerMap('china', geo)
  })()
  return _chinaGeoLoaded
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

/** 调整颜色亮度：factor 0=原色, 1=白色, -1=黑色 */
function shadeColor(rgb: { r: number; g: number; b: number }, factor: number): string {
  if (factor >= 0) {
    const r = Math.round(rgb.r + (255 - rgb.r) * factor)
    const g = Math.round(rgb.g + (255 - rgb.g) * factor)
    const b = Math.round(rgb.b + (255 - rgb.b) * factor)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const f = 1 + factor
    const r = Math.round(rgb.r * f)
    const g = Math.round(rgb.g * f)
    const b = Math.round(rgb.b * f)
    return `rgb(${r}, ${g}, ${b})`
  }
}

function buildPieces(max: number, colors: string[]) {
  if (max <= 0) {
    return [{ min: 0, max: 0, color: colors[0], label: '0' }]
  }
  const step = Math.max(1, Math.ceil(max / 5))
  const pieces: { min: number; max: number; color: string; label: string }[] = []
  for (let i = 0; i < 5; i++) {
    const lo = i === 0 ? 1 : i * step + 1
    const hi = (i + 1) * step
    if (lo > max) break
    pieces.push({
      min: lo,
      max: Math.min(hi, max),
      color: colors[i + 1],
      label: `${lo}-${Math.min(hi, max)}`,
    })
  }
  pieces.unshift({ min: 0, max: 0, color: colors[0], label: '0' })
  return pieces
}

export default function ChinaMap({
  provinces,
  typeName,
  color,
  onSelectProvince,
  highlightedProvince,
}: ChinaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const onSelectRef = useRef(onSelectProvince)
  const highlightRef = useRef(highlightedProvince)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartReady, setChartReady] = useState(false)
  const [themeKey, setThemeKey] = useState(0)

  // 监听主题变化，触发重渲染
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey((k) => k + 1)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    onSelectRef.current = onSelectProvince
  }, [onSelectProvince])
  useEffect(() => {
    highlightRef.current = highlightedProvince
  }, [highlightedProvince])

  useEffect(() => {
    let disposed = false
    let ro: ResizeObserver | null = null

    ensureChinaGeo()
      .then(() => {
        if (disposed || !containerRef.current) return
        const chart = echarts.init(containerRef.current, undefined, {
          renderer: 'canvas',
        })
        chartRef.current = chart
        setLoading(false)
        setChartReady(true)

        ro = new ResizeObserver(() => {
          chart.resize()
        })
        ro.observe(containerRef.current)

        chart.on('click', (params: any) => {
          if (params.componentType === 'series' && params.seriesType === 'map') {
            const prov = params.name
            // 跳过无数据区域（如南海诸岛、空名称等）
            if (!prov || prov === '南海诸岛') return
            const cur = highlightRef.current
            onSelectRef.current?.(prov === cur ? null : prov)
          }
        })
      })
      .catch((e) => {
        console.error('Failed to init ChinaMap:', e)
        setError(e instanceof Error ? e.message : '地图加载失败')
        setLoading(false)
      })

    return () => {
      disposed = true
      if (ro) ro.disconnect()
      if (chartRef.current) {
        chartRef.current.dispose()
        chartRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !provinces || !chartReady) return

    // 检测当前主题
    const isLight = document.documentElement.classList.contains('light')

    const merged = new Map<string, { name: string; value: number; rawName: string }>()
    for (const p of provinces) {
      const norm = normalizeProvinceName(p.name)
      const existing = merged.get(norm)
      if (existing) {
        existing.value += p.count
      } else {
        merged.set(norm, { name: norm, value: p.count, rawName: p.name })
      }
    }
    const data = Array.from(merged.values())
    const max = Math.max(1, ...data.map((d) => d.value))

    const colorRgb = hexToRgb(color) || { r: 6, g: 182, b: 212 }
    // 颜色序列：根据主题切换
    const colorStops = isLight
      ? [
          '#f1f5f9', // 0 数据：浅灰
          shadeColor(colorRgb, 0.7), // 1-6：浅主色
          shadeColor(colorRgb, 0.4), // 7-12
          shadeColor(colorRgb, 0.15), // 13-18
          shadeColor(colorRgb, -0.1), // 19-24
          shadeColor(colorRgb, -0.3), // 25+：深主色
        ]
      : [
          'rgba(15, 30, 60, 0.6)', // 0 数据：深蓝半透明
          shadeColor(colorRgb, -0.6),
          shadeColor(colorRgb, -0.3),
          shadeColor(colorRgb, 0),
          shadeColor(colorRgb, 0.2),
          shadeColor(colorRgb, 0.4),
        ]

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(5, 10, 24, 0.95)',
        borderColor: isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        textStyle: { color: isLight ? '#0f172a' : '#e2e8f0', fontSize: 13 },
        padding: [10, 14],
        extraCssText: `box-shadow: 0 0 20px ${isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(56, 189, 248, 0.3)'}; backdrop-filter: blur(8px);`,
        formatter: (params: any) => {
          // 处理 NaN/null/undefined：无数据区域显示 0，避免显示 "NaN"
          const rawValue = params.value
          const v = typeof rawValue === 'number' && !Number.isNaN(rawValue) ? rawValue : 0
          const raw = merged.get(params.name)?.rawName || params.name
          const labelColor = isLight ? '#0f172a' : '#fff'
          const subColor = isLight ? '#64748b' : '#94a3b8'
          return `<div style="font-weight:600;font-size:14px;margin-bottom:4px;color:${labelColor}">${raw}</div>
                  <div style="color:${subColor};font-size:11px">${typeName}：</div>
                  <div style="margin-top:2px"><span style="color:${color};font-weight:700;font-size:18px;font-family:monospace">${v}</span><span style="color:${subColor};font-size:11px"> 个</span></div>`
        },
      },
      visualMap: {
        type: 'piecewise',
        min: 0,
        max,
        pieces: buildPieces(max, colorStops),
        orient: 'horizontal',
        left: 'center',
        bottom: 12,
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 6,
        textStyle: { color: isLight ? '#475569' : '#94a3b8', fontSize: 11 },
        calculable: false,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(5, 10, 24, 0.6)',
        borderColor: isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(56, 189, 248, 0.2)',
        borderWidth: 1,
        padding: [6, 10],
        borderRadius: 4,
      },
      geo: {
        map: 'china',
        roam: true,
        scaleLimit: { min: 0.9, max: 4 },
        // 使用 center + zoom 让地图居中显示
        center: [104, 36], // 中国大致地理中心
        zoom: 1.25,
        label: { show: false },
        // 隐藏南海诸岛缩略图（避免显示无数据的空区域）
        showLegendSymbol: false,
        itemStyle: {
          areaColor: isLight ? '#f8fafc' : 'rgba(15, 30, 60, 0.5)',
          borderColor: isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(56, 189, 248, 0.25)',
          borderWidth: 0.6,
          shadowColor: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(56, 189, 248, 0.4)',
          shadowBlur: 8,
        },
        emphasis: {
          label: { show: true, color: isLight ? '#0f172a' : '#fff', fontWeight: 600, fontSize: 12 },
          itemStyle: {
            areaColor: null,
            borderColor: isLight ? '#2563eb' : '#06b6d4',
            borderWidth: 1.5,
            shadowColor: isLight ? 'rgba(59, 130, 246, 0.5)' : 'rgba(56, 189, 248, 0.8)',
            shadowBlur: 16,
          },
        },
      },
      series: [
        {
          name: typeName,
          type: 'map',
          map: 'china',
          geoIndex: 0,
          data,
          selectedMode: 'single',
          select: {
            label: { show: true, color: '#fff', fontWeight: 700, fontSize: 12 },
            itemStyle: {
              areaColor: color,
              borderColor: '#fff',
              borderWidth: 1.5,
              shadowColor: color,
              shadowBlur: 20,
            },
          },
        },
      ],
    }

    chart.setOption(option, true)

    if (highlightedProvince) {
      const norm = normalizeProvinceName(highlightedProvince)
      chart.dispatchAction({
        type: 'select',
        seriesIndex: 0,
        name: norm,
      })
    }
  }, [provinces, typeName, color, highlightedProvince, chartReady, themeKey])

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
            <div className="text-cyan-300 text-sm">加载地图数据...</div>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-rose-400 text-sm">{error}</div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
