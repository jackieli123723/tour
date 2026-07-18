'use client'

import { Download, RefreshCw, Filter, Clock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DatasetMeta {
  typeId: number
  name: string
  shortName: string
  color: string
  icon: string
  total: number
  officialTotal: number
  provinceCount: number
  fetchedAt: string | null
  latestRecordAt: string | null
  integrityPassed: boolean
}

interface ToolbarProps {
  datasets: DatasetMeta[]
  currentTypeId: number
  onSelectType: (id: number) => void
  onExport: () => void
  onRefresh: () => void
  refreshing: boolean
  regionFilter: string | null
  onRegionChange: (region: string | null) => void
}

const REGIONS = ['华北', '东北', '华东', '华中', '华南', '西南', '西北']

export default function Toolbar({
  datasets,
  currentTypeId,
  onSelectType,
  onExport,
  onRefresh,
  refreshing,
  regionFilter,
  onRegionChange,
}: ToolbarProps) {
  const [showRegions, setShowRegions] = useState(false)
  const regionRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭区域筛选下拉
  useEffect(() => {
    if (!showRegions) return
    const handler = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setShowRegions(false)
      }
    }
    // 延迟绑定避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [showRegions])

  return (
    <div className="relative z-40 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1.5">
        {datasets.map((d) => {
          const isActive = d.typeId === currentTypeId
          const integrityOk = d.integrityPassed !== false
          return (
            <button
              key={d.typeId}
              type="button"
              onClick={() => onSelectType(d.typeId)}
              className={`group relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
              style={isActive ? { background: d.color } : undefined}
              title={`${d.name} | ${d.total}条 | ${d.fetchedAt ? '抓取于 ' + new Date(d.fetchedAt).toLocaleString('zh-CN') : '未抓取'}`}
            >
              <span className="text-sm">{d.icon}</span>
              <span>{d.shortName}</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {d.total}
              </span>
              {/* 完整性指示器 */}
              {!integrityOk && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white"
                  title="数据完整性异常"
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5 relative z-50">
        {/* 区域筛选 */}
        <div className="relative" ref={regionRef}>
          <button
            type="button"
            onClick={() => setShowRegions((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              regionFilter
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {regionFilter || '区域筛选'}
          </button>
          {showRegions && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full z-[100] mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  onRegionChange(null)
                  setShowRegions(false)
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
              >
                全部
              </button>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onRegionChange(r)
                    setShowRegions(false)
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${
                    regionFilter === r ? 'font-semibold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onExport}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                导出
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">导出当前数据集 CSV</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '刷新中' : '刷新'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">强制从文旅部重新抓取最新数据</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="hidden items-center gap-1 text-[11px] text-slate-400 lg:flex">
          <Clock className="h-3 w-3" />
          {(() => {
            const ds = datasets.find((d) => d.typeId === currentTypeId)
            if (!ds?.fetchedAt) return '未抓取'
            const d = new Date(ds.fetchedAt)
            return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          })()}
        </div>
      </div>
    </div>
  )
}
