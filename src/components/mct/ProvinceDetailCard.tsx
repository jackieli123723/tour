'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Hash, Building2, ExternalLink } from 'lucide-react'

interface SpotItem {
  id: number
  name: string
  provinceName?: string
  year?: string | null
  batch?: number
  place?: string | null
  created_at?: string
}

interface ProvinceDetailCardProps {
  provinceName: string | null
  spots: SpotItem[]
  typeName: string
  color: string
  onClose: () => void
}

/**
 * 去掉名称末尾的年份后缀
 * 例如："连云港市连岛景区2024年" → "连云港市连岛景区"
 */
function stripTrailingYear(name: string): string {
  if (!name) return name
  return name
    .replace(/\d{4}年$/, '')
    .replace(/[二〇一二三四五六七八九]{4}年$/, '')
    .trim()
}

export default function ProvinceDetailCard({
  provinceName,
  spots,
  typeName,
  color,
  onClose,
}: ProvinceDetailCardProps) {
  return (
    <AnimatePresence>
      {provinceName && (
        <motion.div
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="sci-detail-card !absolute right-3 top-3 bottom-3 z-20 w-[340px] overflow-hidden flex flex-col"
          style={{ borderColor: `${color}40`, boxShadow: `0 0 30px ${color}30` }}
        >
          {/* 标题栏 */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b sci-detail-header"
            style={{
              background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
              borderColor: `${color}30`,
            }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color }} />
              <span className="sci-t-active text-sm font-semibold">{provinceName}</span>
              <span
                className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-mono"
                style={{ background: `${color}30`, color }}
              >
                {spots.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sci-detail-close rounded-md p-1 transition-colors"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 数据集标签栏 */}
          <div className="sci-detail-subheader border-b px-4 py-1.5">
            <span className="sci-t-muted text-[10px]">数据集：</span>
            <span className="sci-t-cyan text-[11px] font-medium">{typeName}</span>
          </div>

          {/* 列表区域 - 用原生 overflow 滚动，避免 ScrollArea 组件高度计算问题 */}
          <div className="sci-scroll flex-1 min-h-0 overflow-y-auto">
            <ul className="sci-detail-list">
              {spots.map((s, idx) => (
                <li
                  key={s.id}
                  className="sci-detail-item px-4 py-2.5 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="sci-number text-[10px] mt-0.5 flex-shrink-0 w-5 text-right"
                      style={{ color }}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="sci-detail-name text-[12px] font-medium leading-snug">
                        {stripTrailingYear(s.name)}
                      </div>
                      <div className="sci-detail-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
                        {s.year && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {s.year}
                          </span>
                        )}
                        {s.batch ? (
                          <span className="inline-flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5" />
                            第{s.batch}批
                          </span>
                        ) : null}
                        {s.place && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-2.5 w-2.5" />
                            {s.place}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {spots.length === 0 && (
                <li className="sci-t-muted py-12 text-center text-sm">该省份暂无数据</li>
              )}
            </ul>
          </div>

          {/* 底部数据来源 */}
          <div className="sci-detail-footer flex-shrink-0 border-t px-4 py-1.5 text-[9px]">
            <span className="sci-t-muted">数据来源：文化和旅游部数据服务栏目</span>
            <a
              href="https://sjfw.mct.gov.cn/site/dataservice/home"
              target="_blank"
              rel="noreferrer"
              className="sci-t-link ml-1 inline-flex items-center gap-0.5 hover:underline"
            >
              查看原始 <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
