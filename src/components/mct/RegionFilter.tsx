'use client'

import { useState, useEffect, useRef } from 'react'
import { Filter, Check, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const REGIONS = [
  { key: '全部', name: '全部', desc: '全国 35 个省级单位' },
  { key: '华北', name: '华北', desc: '北京·天津·河北·山西·内蒙古' },
  { key: '东北', name: '东北', desc: '辽宁·吉林·黑龙江' },
  { key: '华东', name: '华东', desc: '上海·江苏·浙江·安徽·福建·江西·山东·台湾' },
  { key: '华中', name: '华中', desc: '河南·湖北·湖南' },
  { key: '华南', name: '华南', desc: '广东·广西·海南·香港·澳门' },
  { key: '西南', name: '西南', desc: '重庆·四川·贵州·云南·西藏' },
  { key: '西北', name: '西北', desc: '陕西·甘肃·青海·宁夏·新疆·兵团' },
] as const

export const REGION_MAP: Record<string, string[]> = {
  全部: [],
  华北: ['北京', '天津', '河北', '山西', '内蒙古'],
  东北: ['辽宁', '吉林', '黑龙江'],
  华东: ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '台湾'],
  华中: ['河南', '湖北', '湖南'],
  华南: ['广东', '广西', '海南', '香港', '澳门'],
  西南: ['重庆', '四川', '贵州', '云南', '西藏'],
  西北: ['陕西', '甘肃', '青海', '宁夏', '新疆', '兵团'],
}

interface RegionFilterProps {
  region: string
  onChange: (region: string) => void
  provinceCount?: number
  totalCount?: number
}

export default function RegionFilter({
  region,
  onChange,
  provinceCount,
  totalCount,
}: RegionFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentRegion = REGIONS.find((r) => r.key === region) || REGIONS[0]

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`sci-region-btn flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
          region !== '全部'
            ? 'sci-region-active'
            : 'sci-btn-ghost'
        }`}
        title={currentRegion.desc}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>{region === '全部' ? '区域筛选' : region}</span>
        {provinceCount !== undefined && (
          <span className="sci-number text-[10px] opacity-70 ml-0.5">
            {provinceCount}省/{totalCount ?? 0}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="sci-region-dropdown absolute right-0 top-full z-[9999] mt-1 w-[300px] rounded-md border py-1 shadow-2xl"
          >
            <div className="sci-t-muted px-3 py-1.5 text-[10px] border-b sci-border-soft font-medium">
              选择区域筛选
            </div>
            <ul className="max-h-[360px] overflow-y-auto sci-scroll py-1">
              {REGIONS.map((r) => {
                const isActive = r.key === region
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(r.key)
                        setOpen(false)
                      }}
                      className={`sci-region-item flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                        isActive ? 'sci-region-item-active' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isActive ? 'sci-t-cyan' : 'sci-t-primary'}`}>
                          {r.name}
                        </div>
                        <div className="sci-t-muted text-[10px] mt-0.5 truncate">
                          {r.desc}
                        </div>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 sci-t-cyan flex-shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
