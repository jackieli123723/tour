'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Map as MapIcon,
  ExternalLink,
  Database,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Download,
  Crown,
  BarChart3,
  Layers,
  Github,
  Maximize,
  Minimize,
} from 'lucide-react'

import ChinaMap from '@/components/mct/ChinaMap'
import TopRanking from '@/components/mct/TopRanking'
import ProvinceDetailCard from '@/components/mct/ProvinceDetailCard'
import TrendChart from '@/components/mct/TrendChart'
import TopRadarChart from '@/components/mct/TopRadarChart'
import RatioDonutChart from '@/components/mct/RatioDonutChart'
import ChartSwitcher, { type ChartType } from '@/components/mct/ChartSwitcher'
import ThemeToggle from '@/components/mct/ThemeToggle'
import { useTheme } from '@/components/mct/ThemeProvider'
import RegionFilter, { REGION_MAP } from '@/components/mct/RegionFilter'
import type { DatasetPayload } from '@/lib/mct/fetcher'
import type { DatasetMeta } from '@/lib/mct/datasets'
import { DATASETS } from '@/lib/mct/datasets'

type DatasetSummary = DatasetMeta & {
  total: number
  officialTotal: number
  actualCount: number
  provinceCount: number
  fetchedAt: string | null
  latestRecordAt: string | null
  integrityPassed: boolean
  integrity?: {
    passed: boolean
    officialTotal: number
    actualCount: number
    uniqueCount: number
    statsSum: number
    duration: number
  } | null
  error?: string
}

function formatRelative(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}小时前`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 30) return `${diffDay}天前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return '—'
  }
}

export default function Home() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>(() =>
    DATASETS.map((d) => ({
      ...d,
      total: 0,
      officialTotal: 0,
      actualCount: 0,
      provinceCount: 0,
      fetchedAt: null,
      latestRecordAt: null,
      integrityPassed: false,
    })),
  )
  const [currentTypeId, setCurrentTypeId] = useState<number>(10)
  const [currentData, setCurrentData] = useState<DatasetPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string>('全部')
  const [chartType, setChartType] = useState<ChartType>('radar')
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [now, setNow] = useState<string>('')

  // 实时时钟
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setNow(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    fmt()
    const timer = setInterval(fmt, 1000)
    return () => clearInterval(timer)
  }, [])

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // 1. 加载数据集列表
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/mct/datasets')
        if (!res.ok) throw new Error('获取数据集列表失败')
        const data = await res.json()
        if (!cancelled && data.datasets?.length) {
          setDatasets(data.datasets)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled)
          toast.error('数据集列表加载失败', { description: e instanceof Error ? e.message : '' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 2. 加载当前数据集
  const loadDataset = useCallback(async (typeId: number, refresh = false) => {
    setLoading(true)
    setSelectedProvince(null)
    try {
      const url = `/api/mct/dataset?type=${typeId}${refresh ? '&refresh=1' : ''}`
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as DatasetPayload
      setCurrentData(data)
    } catch (e) {
      console.error(e)
      toast.error('数据加载失败', { description: e instanceof Error ? e.message : '' })
      setCurrentData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await loadDataset(currentTypeId)
    })()
  }, [currentTypeId, loadDataset])

  // 3. 刷新全部
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/mct/refresh', { method: 'POST' })
      if (!res.ok) throw new Error('刷新失败')
      const result = await res.json()
      if (!result.success) throw new Error(result.error || '刷新失败')

      const allOk = result.allIntegrityPassed
      const totalRecords = result.summary?.totalRecords || 0
      const totalOfficial = result.summary?.totalOfficial || 0
      if (allOk) {
        toast.success(`已刷新 ${result.refreshed} 个数据集 · 完整性校验通过`, {
          description: (
            <div className="mct-toast-list">
              {result.datasets?.map((d: any, i: number) => (
                <div key={i} className="mct-toast-row">
                  <span className="mct-toast-name">{d.typeName}</span>
                  <b className="mct-toast-num">{d.actualCount}/{d.officialTotal}</b>
                </div>
              ))}
            </div>
          ),
        })
      } else {
        toast.warning(`已刷新 ${result.refreshed} 个数据集 · 部分完整性异常`, {
          description: (
            <div className="mct-toast-list">
              <div className="mct-toast-row">
                <span className="mct-toast-name">实际 / 官方</span>
                <b className="mct-toast-num">{totalRecords} / {totalOfficial}</b>
              </div>
              <div className="mct-toast-row" style={{ color: '#94a3b8' }}>
                <span className="mct-toast-name">提示</span>
                <span style={{ fontSize: 10 }}>请检查日志</span>
              </div>
            </div>
          ),
        })
      }
      await loadDataset(currentTypeId, true)
      const listRes = await fetch('/api/mct/datasets')
      if (listRes.ok) {
        const listData = await listRes.json()
        if (listData.datasets?.length) setDatasets(listData.datasets)
      }
    } catch (e) {
      toast.error('刷新失败', { description: e instanceof Error ? e.message : '' })
    } finally {
      setRefreshing(false)
    }
  }, [currentTypeId, loadDataset])

  // 4. 导出 CSV
  const handleExport = useCallback(() => {
    if (!currentData) {
      toast.error('请先加载数据')
      return
    }
    toast.success('正在导出 CSV...', {
      description: `${currentData.typeName} 共 ${currentData.total} 条`,
    })
    window.open(`/api/mct/export?type=${currentTypeId}`, '_blank')
  }, [currentData, currentTypeId])

  const currentMeta = useMemo(
    () => datasets.find((d) => d.typeId === currentTypeId) || datasets[0],
    [datasets, currentTypeId],
  )

  // 按区域筛选后的省份数据
  const filteredProvinces = useMemo(() => {
    if (!currentData) return []
    const regionProv = REGION_MAP[regionFilter] || []
    if (regionFilter === '全部' || regionProv.length === 0) return currentData.provinces
    return currentData.provinces.filter((p) => regionProv.includes(p.name))
  }, [currentData, regionFilter])

  // 按区域筛选后的总条目数
  const filteredTotal = useMemo(() => {
    return filteredProvinces.reduce((s, p) => s + p.count, 0)
  }, [filteredProvinces])

  // 把地图上点击的省份名（如"新疆维吾尔自治区"）转换为 spots 中的 provinceName 列表（如 ["新疆", "兵团"]）
  const selectedProvinceSpots = useMemo(() => {
    if (!selectedProvince || !currentData) return []
    // 1. 先精确匹配
    let matched = currentData.spots.filter((s) => s.provinceName === selectedProvince)
    if (matched.length > 0) return matched

    // 2. 模糊匹配：去掉"省/市/自治区/特别行政区/壮族/回族/维吾尔"等后缀后再匹配
    const normalize = (name: string) =>
      name
        .replace(/(维吾尔|壮族|回族)?自治区$/, '')
        .replace(/特别行政区$/, '')
        .replace(/省$|市$/, '')
        .trim()

    const normalizedSelected = normalize(selectedProvince)
    // 特殊处理：新疆包含兵团（地图上合并显示）
    if (normalizedSelected === '新疆') {
      return currentData.spots.filter((s) => s.provinceName === '新疆' || s.provinceName === '兵团')
    }
    return currentData.spots.filter((s) => {
      const n = s.provinceName || ''
      return n === normalizedSelected || normalize(n) === normalizedSelected
    })
  }, [selectedProvince, currentData])

  // 榜首省份（根据筛选更新）
  const topProvince = useMemo(() => {
    if (!filteredProvinces.length) return null
    return [...filteredProvinces].sort((a, b) => b.count - a.count)[0]
  }, [filteredProvinces])

  const totalRecords = datasets.reduce((s, d) => s + (d.total || 0), 0)
  const totalOfficial = datasets.reduce((s, d) => s + (d.officialTotal || 0), 0)
  const allIntegrityPassed = datasets.every((d) => d.integrityPassed !== false)

  return (
    <div className="sci-grid-bg h-screen flex flex-col overflow-hidden">
      {/* ============ Header ============ */}
      <header className="sci-header relative z-50 flex items-center justify-between border-b border-cyan-500/15 px-5 py-3 backdrop-blur-md">
        <div className="absolute inset-0 sci-scan-line pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-700 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            <MapIcon className="h-5 w-5 text-white" />
            <div className="absolute -inset-0.5 rounded-md border border-cyan-300/30" />
          </div>
          <div>
            <h1 className="text-lg font-bold sci-gradient-text leading-tight tracking-wide">
              全国文化和旅游数据可视化大屏
            </h1>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] sci-t-tertiary">
              <span>数据源：</span>
              <a
                href="https://sjfw.mct.gov.cn/site/dataservice/home"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 transition-colors hover:text-cyan-300"
              >
                文化和旅游部数据服务栏目
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-3">
          {/* 完整性状态 */}
          <div className="hidden items-center gap-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 md:flex">
            <span
              className={`sci-pulse-dot ${
                allIntegrityPassed ? 'bg-emerald-400 sci-t-emerald' : 'bg-amber-400 sci-t-amber'
              }`}
            />
            <span className="text-[11px] sci-t-secondary">数据完整性</span>
            <span
              className={`sci-number text-xs font-semibold ${
                allIntegrityPassed ? 'sci-t-emerald' : 'sci-t-amber'
              }`}
            >
              {totalRecords.toLocaleString()} / {totalOfficial.toLocaleString()}
            </span>
            {allIntegrityPassed ? (
              <ShieldCheck className="h-3.5 w-3.5 sci-t-emerald" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 sci-t-amber" />
            )}
          </div>
          {/* 操作按钮 */}
          <RegionFilter
            region={regionFilter}
            onChange={(r) => {
              setRegionFilter(r)
              setSelectedProvince(null)
            }}
            provinceCount={filteredProvinces.length}
            totalCount={filteredTotal}
          />
          <a
            href="/mct-data-dashboard.zip"
            download="mct-data-dashboard.zip"
            className="sci-btn-emerald flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all"
            title="下载项目源代码 ZIP 包"
          >
            <Download className="h-3.5 w-3.5" />
            源码下载
          </a>
          <button
            type="button"
            onClick={handleExport}
            className="sci-btn-ghost flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            导出CSV
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="sci-btn-cyan flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中' : '刷新'}
          </button>
          {/* 主题切换按钮 */}
          <ThemeToggle />
          {/* 全屏切换 */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏'}
            className="sci-btn-ghost flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-all"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </button>
          {/* GitHub 仓库 */}
          <a
            href="https://github.com/jackieli123723"
            target="_blank"
            rel="noreferrer"
            title="GitHub 仓库"
            className="sci-btn-ghost flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-all"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* ============ 主体三列布局 ============ */}
      <main className="flex flex-1 gap-3 p-3 overflow-hidden">
        {/* ===== 左列：数据集切换 + 汇总 ===== */}
        <aside className="flex w-[260px] flex-shrink-0 flex-col gap-3 overflow-hidden min-h-0">
          {/* 数据集切换器 */}
          <div className="sci-card sci-card-hover sci-scroll flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="sci-section-title">
                <Layers className="h-3.5 w-3.5 sci-t-cyan" />
                数据集切换
              </div>
              <span className="text-[10px] sci-t-muted">{datasets.length} 类</span>
            </div>
            <div className="sci-scroll flex-1 overflow-y-auto px-3 pb-1 pt-1 flex flex-col gap-1">
              {datasets.map((d) => {
                const isActive = d.typeId === currentTypeId
                const integrityOk = d.integrityPassed !== false
                return (
                  <button
                    key={d.typeId}
                    type="button"
                    onClick={() => setCurrentTypeId(d.typeId)}
                    className={`group relative flex w-full flex-1 min-h-[44px] flex-shrink-0 items-center gap-2.5 rounded-md border px-2.5 text-left transition-all ${
                      isActive
                        ? 'sci-dataset-active'
                        : 'sci-pill-bg sci-pill-text sci-hover-soft'
                    }`}
                    style={isActive ? {
                      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.95)',
                      backgroundImage: isLight
                        ? `linear-gradient(135deg, ${d.color}25 0%, ${d.color}08 100%)`
                        : `linear-gradient(135deg, ${d.color}40 0%, ${d.color}10 100%)`,
                      borderColor: d.color,
                      boxShadow: isLight
                        ? '0 1px 4px rgba(0, 0, 0, 0.06)'
                        : `0 0 8px ${d.color}50`,
                    } as React.CSSProperties : undefined}
                  >
                    {/* 颜色指示条 */}
                    <span
                      className="sci-dataset-bar flex-shrink-0 rounded-full transition-all"
                      style={{
                        background: d.color,
                        boxShadow: isActive ? `0 0 6px ${d.color}` : 'none',
                        width: '3px',
                        height: isActive ? '26px' : '20px',
                        opacity: isActive ? 1 : 0.5,
                      }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-semibold truncate transition-colors ${
                        isActive ? 'sci-t-active' : 'sci-t-secondary'
                      }`}>
                        {d.name}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="sci-number text-[14px] font-bold transition-colors"
                          style={{ color: isActive ? d.color : undefined }}
                        >
                          {d.total}
                        </span>
                        <span className={`text-[10px] ${isActive ? 'text-slate-400' : 'sci-t-muted'}`}>条</span>
                        {!integrityOk && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" title="完整性异常" />
                        )}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 汇总统计 */}
          <div className="sci-card p-3 space-y-2">
            <div className="sci-section-title">
              <Activity className="h-3.5 w-3.5 sci-t-cyan" />
              当前数据集
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="sci-subcard rounded-md border p-2">
                <div className="text-[10px] sci-t-muted">
                  条目总数
                  {regionFilter !== '全部' && (
                    <span className="ml-1 text-rose-300">[{regionFilter}]</span>
                  )}
                </div>
                <div className="sci-number text-xl font-bold sci-t-cyan mt-0.5">
                  {filteredTotal.toLocaleString()}
                </div>
              </div>
              <div className="sci-subcard rounded-md border p-2">
                <div className="text-[10px] sci-t-muted">
                  覆盖省份
                  {regionFilter !== '全部' && (
                    <span className="ml-1 text-rose-300">[{regionFilter}]</span>
                  )}
                </div>
                <div className="sci-number text-xl font-bold sci-t-purple mt-0.5">
                  {filteredProvinces.length}
                </div>
              </div>
              <div className="sci-subcard rounded-md border p-2">
                <div className="text-[10px] sci-t-muted">榜首省份</div>
                <div className="text-sm font-semibold sci-t-amber mt-0.5 truncate">
                  {topProvince?.name || '—'}
                </div>
              </div>
              <div className="sci-subcard rounded-md border p-2">
                <div className="text-[10px] sci-t-muted">榜首数量</div>
                <div className="sci-number text-xl font-bold sci-t-emerald mt-0.5">
                  {topProvince?.count || 0}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-cyan-500/10 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="sci-t-muted flex items-center gap-1">
                  <Database className="h-2.5 w-2.5" />
                  数据源更新
                </span>
                <span className="sci-number sci-t-tertiary">
                  {currentData?.latestRecordAt?.slice(0, 10) || '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== 中列：地图主体 ===== */}
        <section className="relative flex-1 sci-card overflow-hidden flex flex-col">
          {/* 地图标题栏 */}
          <div className="sci-map-titlebar absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-[rgba(5,10,24,0.85)] to-transparent pointer-events-none">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 sci-t-cyan" />
              <h2 className="text-sm font-semibold sci-t-secondary">
                {currentMeta?.icon} {currentMeta?.name}
              </h2>
              {regionFilter !== '全部' && (
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300 font-medium">
                  {regionFilter} · {filteredProvinces.length}省 · {filteredTotal}
                </span>
              )}
              {loading && (
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] sci-t-cyan border border-cyan-500/20">
                  加载中...
                </span>
              )}
            </div>
            <div className="text-[11px] sci-t-muted max-w-[60%] truncate">
              {currentMeta?.description}
            </div>
          </div>

          {/* 地图容器 */}
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {currentData && currentData.provinces.length > 0 ? (
              <ChinaMap
                provinces={filteredProvinces}
                typeName={currentMeta?.name || ''}
                color={currentMeta?.color || '#06b6d4'}
                onSelectProvince={(name) => setSelectedProvince(name)}
                highlightedProvince={selectedProvince}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm sci-t-muted">
                {loading ? '正在从文旅部抓取数据...' : '暂无数据'}
              </div>
            )}
            <ProvinceDetailCard
              provinceName={selectedProvince}
              spots={selectedProvinceSpots}
              typeName={currentMeta?.name || ''}
              color={currentMeta?.color || '#06b6d4'}
              onClose={() => setSelectedProvince(null)}
            />
          </div>

          {/* 底部状态条 */}
          <div className="sci-map-statusbar absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-t from-[rgba(5,10,24,0.85)] to-transparent text-[10px] sci-t-muted pointer-events-none">
            <span className="flex items-center gap-1.5">
              <span className="sci-pulse-dot bg-cyan-400 sci-t-cyan" />
              <span>提示：点击省份查看详情 / 滚轮缩放 / 拖拽平移</span>
            </span>
            <span className="sci-number">
              zoom: 1.18 · 当前时间: {now || '—'} · 数据抓取: {formatRelative(currentData?.fetchedAt)}
            </span>
          </div>
        </section>

        {/* ===== 右列：榜单 + 趋势 + 概览 ===== */}
        <aside className="flex w-[340px] flex-shrink-0 flex-col gap-3 overflow-hidden min-h-0">
          {/* TOP15 排行榜 */}
          <div className="sci-card flex flex-col min-h-0" style={{ flex: '4 1 0%' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-cyan-500/10">
              <div className="sci-section-title">
                <Crown className="h-3.5 w-3.5 sci-t-amber" />
                省份排行榜 TOP15
                {regionFilter !== '全部' && (
                  <span className="ml-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-300">
                    {regionFilter}
                  </span>
                )}
              </div>
              <span className="sci-number text-[11px] sci-t-cyan font-semibold">
                {filteredTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <TopRanking
                provinces={filteredProvinces}
                color={currentMeta?.color || '#06b6d4'}
                onSelect={(name) => setSelectedProvince((prev) => (prev === name ? null : name))}
                selected={selectedProvince}
                total={filteredTotal}
              />
            </div>
          </div>

          {/* TOP10 数据对比 - 带图表切换器 */}
          <div className="sci-card flex flex-col min-h-0" style={{ flex: '4 1 0%' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-cyan-500/10">
              <div className="sci-section-title">
                <BarChart3 className="h-3.5 w-3.5 sci-t-cyan" />
                TOP10 数据对比
              </div>
              <ChartSwitcher current={chartType} onChange={setChartType} />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2 pt-1">
              {chartType === 'radar' && (
                <TopRadarChart
                  provinces={filteredProvinces}
                  color={currentMeta?.color || '#06b6d4'}
                />
              )}
              {chartType === 'donut' && (
                <RatioDonutChart
                  provinces={filteredProvinces}
                  color={currentMeta?.color || '#06b6d4'}
                />
              )}
              {chartType === 'bar' && (
                <TrendChart
                  provinces={filteredProvinces}
                  color={currentMeta?.color || '#06b6d4'}
                />
              )}
            </div>
          </div>

          {/* 数据集概览 */}
          <div className="sci-card flex flex-col min-h-0" style={{ flex: '3 1 0%' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-cyan-500/10">
              <div className="sci-section-title">
                <Database className="h-3.5 w-3.5 sci-t-cyan" />
                全部数据集概览
              </div>
              <span className="sci-number text-[10px] sci-t-muted">
                {datasets.length} 类 · {totalRecords.toLocaleString()} 条
              </span>
            </div>
            <div className="sci-scroll flex-1 overflow-y-auto px-2 pb-2 pt-1 space-y-0.5">
              {datasets.map((d) => {
                const integrityOk = d.integrityPassed !== false
                const isActive = d.typeId === currentTypeId
                return (
                  <button
                    key={d.typeId}
                    type="button"
                    onClick={() => setCurrentTypeId(d.typeId)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-all border ${
                      isActive
                        ? 'sci-subcard'
                        : 'border-transparent sci-hover-soft'
                    }`}
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }}
                    />
                    <span className={`flex-1 truncate text-[11px] ${isActive ? 'sci-t-cyan-strong font-medium' : 'sci-t-tertiary'}`}>
                      {d.name}
                    </span>
                    <span
                      className={`sci-number text-[12px] font-bold ${isActive ? '' : 'sci-t-secondary'}`}
                      style={isActive ? { color: d.color } : undefined}
                    >
                      {d.total.toLocaleString()}
                    </span>
                    {integrityOk ? (
                      <ShieldCheck className="h-3 w-3 sci-t-emerald opacity-70 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 sci-t-amber flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
