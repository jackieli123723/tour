'use client'

import { motion } from 'framer-motion'
import { Database, Layers, Map as MapIcon, TrendingUp, Clock, ShieldCheck, AlertTriangle } from 'lucide-react'

interface SummaryCardsProps {
  totalDatasets: number
  currentTypeName: string
  currentTotal: number
  currentProvinceCount: number
  topProvinceName: string | null
  topProvinceCount: number
  color: string
  /** 数据集最近一次抓取时间 */
  lastRefreshAt?: string | null
  /** 数据源最新记录时间 */
  latestRecordAt?: string | null
  /** 完整性是否全部通过 */
  allIntegrityPassed?: boolean
  /** 总记录数 */
  totalRecords?: number
  /** 官方总记录数 */
  totalOfficial?: number
}

function formatTime(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin} 分钟前`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} 小时前`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 30) return `${diffDay} 天前`
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return '—'
  }
}

export default function SummaryCards({
  totalDatasets,
  currentTypeName,
  currentTotal,
  currentProvinceCount,
  topProvinceName,
  topProvinceCount,
  color,
  lastRefreshAt,
  latestRecordAt,
  allIntegrityPassed,
  totalRecords = 0,
  totalOfficial = 0,
}: SummaryCardsProps) {
  const cards = [
    {
      label: '数据集总数',
      value: totalDatasets,
      suffix: '类',
      icon: Database,
      color: '#0EA5E9',
      desc: `共 ${totalRecords.toLocaleString()} 条数据`,
      sub: allIntegrityPassed === undefined ? null : (
        <span className={`inline-flex items-center gap-1 ${allIntegrityPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
          {allIntegrityPassed ? <ShieldCheck className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
          {allIntegrityPassed ? '完整性校验通过' : '完整性异常'}
        </span>
      ),
    },
    {
      label: `${currentTypeName}`,
      value: currentTotal,
      suffix: '个',
      icon: Layers,
      color,
      desc: '当前数据集条目数',
      sub: null,
    },
    {
      label: '覆盖省份',
      value: currentProvinceCount,
      suffix: '个',
      icon: MapIcon,
      color: '#7C3AED',
      desc: '当前数据集分布省份',
      sub: null,
    },
    {
      label: '榜首省份',
      value: topProvinceName || '—',
      suffix: topProvinceName ? `${topProvinceCount}个` : '',
      icon: TrendingUp,
      color: '#F97316',
      desc: '当前数据集分布最多',
      isText: true,
      sub: null,
    },
  ]

  return (
    <div className="space-y-2">
      {/* 4 张主统计卡片 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-slate-500">{c.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span
                    className={`${c.isText ? 'text-base' : 'text-2xl'} font-bold tabular-nums truncate`}
                    style={{ color: c.color }}
                  >
                    {c.value}
                  </span>
                  {c.suffix && <span className="text-[11px] text-slate-400">{c.suffix}</span>}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 truncate">{c.desc}</div>
                {c.sub && <div className="mt-1 text-[10px]">{c.sub}</div>}
              </div>
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
                style={{ background: `${c.color}15` }}
              >
                <c.icon className="h-4 w-4" style={{ color: c.color }} />
              </div>
            </div>
            <div
              className="absolute bottom-0 left-0 h-0.5 w-full"
              style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }}
            />
          </motion.div>
        ))}
      </div>

      {/* 数据更新时间条 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-slate-500">数据抓取时间：</span>
          <span className="font-medium text-slate-700" title={lastRefreshAt || ''}>
            {formatTime(lastRefreshAt)}
          </span>
        </span>
        <span className="text-slate-300">|</span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Clock className="h-3 w-3 text-slate-400" />
          <span className="text-slate-500">数据源更新时间：</span>
          <span className="font-medium text-slate-700" title={latestRecordAt || ''}>
            {latestRecordAt ? latestRecordAt.slice(0, 10) : '—'}
          </span>
        </span>
        {totalOfficial > 0 && (
          <>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <span className="text-slate-500">数据完整性：</span>
              <span className={`font-medium ${totalRecords === totalOfficial ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalRecords.toLocaleString()} / {totalOfficial.toLocaleString()} 条
              </span>
              {totalRecords === totalOfficial && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
