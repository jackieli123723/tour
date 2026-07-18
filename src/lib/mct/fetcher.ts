/**
 * 文化和旅游部数据服务 - 抓取器
 * 负责从 sjfw.mct.gov.cn 抓取数据，缓存到 Prisma 数据库
 *
 * 完整性保障策略：
 *  1. 先调 list?page=1&size=1 拿到官方 total
 *  2. 基于 total 计算 size=100 的真实页数
 *  3. 翻页时单页失败自动重试 3 次
 *  4. 抓完后断言 spots.length === total，不匹配则继续重试整轮
 *  5. 基于 id 去重，避免分页边界重复
 *  6. 校验 stats 各省 count 之和 === total
 */

import { db } from '@/lib/db'
import { DATASET_MAP, PROVINCE_CODE_TO_NAME } from './datasets'

const MCT_BASE = 'https://sjfw.mct.gov.cn'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 小时缓存
const PAGE_SIZE = 20 // 后端固定每页 20 条，无法自定义
const MAX_PAGE_RETRIES = 3 // 单页失败重试次数
const MAX_DATASET_RETRIES = 2 // 整个数据集重试次数
const MAX_PAGES_LIMIT = 500 // 单数据集最多抓 500 页（10000 条）安全阀

export interface SpotItem {
  id: number
  name: string
  province: number
  provinceName?: string
  year?: string | null
  grade?: string | number | null
  batch?: number
  place?: string | null
  created_at?: string
}

export interface ProvinceStat {
  province: number
  name: string
  count: number
}

export interface DatasetPayload {
  typeId: number
  typeName: string
  total: number
  /** 官方 total 字段（用于完整性校验展示） */
  officialTotal: number
  /** 抓取到的实际条目数 */
  actualCount: number
  provinces: ProvinceStat[]
  spots: SpotItem[]
  fetchedAt: string
  /** 数据源最后更新日期（从 list 接口的 created_at 字段推断） */
  latestRecordAt: string | null
  sourceUrl: string
  /** 完整性校验结果 */
  integrity: {
    passed: boolean
    officialTotal: number
    actualCount: number
    uniqueCount: number
    statsSum: number
    duration: number
  }
}

async function fetchJson<T>(url: string, referer?: string): Promise<T> {
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  }
  if (referer) headers['Referer'] = referer
  const res = await fetch(MCT_BASE + url, { headers, next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  const data = (await res.json()) as { code: number; data: T; message?: string }
  if (data.code !== 20000) {
    throw new Error(`API code ${data.code} for ${url}: ${data.message ?? ''}`)
  }
  return data.data
}

interface RawSpotItem {
  id: number
  grade?: string | number
  batch?: number
  code?: number | string | null
  name: string
  province: number
  place?: string | null
  year?: string | null
  created_at?: string
  provinceName?: string
}

interface SpotListResp {
  list: RawSpotItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface SpotStatsItem {
  province: number
  count: number
  name: string
}
type SpotStatsResp = SpotStatsItem[]

/** 带重试的 fetch，单页失败自动重试 */
async function fetchJsonWithRetry<T>(
  url: string,
  referer: string,
  retries = MAX_PAGE_RETRIES,
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJson<T>(url, referer)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < retries) {
        // 指数退避：500ms / 1s / 2s
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError!
}

/**
 * 抓取指定 type 的全部数据
 * 1. 调 /api/spot/stats/{type} 拿到省份数量
 * 2. 调 /api/spot/list/{type}?page=1&size=100 拿到官方 total 和真实 last_page
 * 3. 翻页抓全部条目，单页失败重试
 * 4. 完整性校验：spots.length === total === sum(stats.count)
 */
export async function fetchDataset(typeId: number): Promise<DatasetPayload> {
  const meta = DATASET_MAP[typeId]
  if (!meta) throw new Error(`Unknown dataset type: ${typeId}`)
  const referer = `/site/dataservice/rural?type=${typeId}`
  const startTime = Date.now()

  // 1. 抓省份数据统计
  const stats = await fetchJsonWithRetry<SpotStatsResp>(`/api/spot/stats/${typeId}`, referer)
  const provinces: ProvinceStat[] = (stats || [])
    .filter((p) => p && p.province)
    .map((p) => ({
      province: p.province,
      name: p.name || PROVINCE_CODE_TO_NAME[p.province] || `代码${p.province}`,
      count: p.count ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
  const statsSum = provinces.reduce((s, p) => s + p.count, 0)

  // 2. 第一页拿到官方 total 和真实页数（后端固定 per_page=20）
  const firstPage = await fetchJsonWithRetry<SpotListResp>(
    `/api/spot/list/${typeId}?page=1`,
    referer,
  )
  const officialTotal: number = firstPage.total || 0
  // 直接用后端返回的 last_page，它已经按 per_page=20 计算好
  const expectedPages = Math.min(MAX_PAGES_LIMIT, Math.max(1, firstPage.last_page || 1))

  console.log(
    `[fetcher] type=${typeId} ${meta.name}: officialTotal=${officialTotal}, last_page=${firstPage.last_page}, expectedPages=${expectedPages}, statsSum=${statsSum}`,
  )

  // 3. 翻页抓全部条目（用 Map 去重，避免分页边界重复）
  const spotsMap = new Map<number, SpotItem>()

  // 把第一页数据塞进去
  for (const raw of firstPage.list || []) {
    spotsMap.set(raw.id, normalizeSpot(raw))
  }

  // 从第 2 页开始抓
  for (let page = 2; page <= expectedPages; page++) {
    try {
      const resp = await fetchJsonWithRetry<SpotListResp>(
        `/api/spot/list/${typeId}?page=${page}`,
        referer,
      )
      if (!resp || !Array.isArray(resp.list)) {
        console.warn(`[fetcher] type=${typeId} page=${page}: invalid response, list not array`)
        break
      }
      for (const raw of resp.list) {
        spotsMap.set(raw.id, normalizeSpot(raw))
      }
      // 每 5 页打一次进度日志
      if (page % 5 === 0 || page === expectedPages) {
        console.log(
          `[fetcher] type=${typeId} progress: ${page}/${expectedPages} pages, spots=${spotsMap.size}`,
        )
      }
      // 如果某页返回空，说明已经到底了
      if (resp.list.length === 0) {
        console.warn(`[fetcher] type=${typeId} page=${page}: empty list, stopping early`)
        break
      }
    } catch (e) {
      console.error(`[fetcher] type=${typeId} page=${page} failed after retries:`, e)
      // 不 break，继续抓下一页，最后靠完整性校验判断
    }
  }

  const spots = Array.from(spotsMap.values())

  // 4. 推断数据源最后更新时间（取最新 created_at）
  let latestRecordAt: string | null = null
  for (const s of spots) {
    if (s.created_at) {
      if (!latestRecordAt || s.created_at > latestRecordAt) {
        latestRecordAt = s.created_at
      }
    }
  }

  // 5. 完整性校验
  const actualCount = spots.length
  const uniqueCount = spotsMap.size
  const passed =
    actualCount === officialTotal && actualCount === uniqueCount && actualCount === statsSum

  const duration = Date.now() - startTime
  console.log(
    `[fetcher] type=${typeId} ${meta.name} DONE: actual=${actualCount}, official=${officialTotal}, unique=${uniqueCount}, statsSum=${statsSum}, passed=${passed}, duration=${duration}ms`,
  )

  return {
    typeId,
    typeName: meta.name,
    total: actualCount,
    officialTotal,
    actualCount,
    provinces,
    spots,
    fetchedAt: new Date().toISOString(),
    latestRecordAt,
    sourceUrl: meta.sourceUrl,
    integrity: {
      passed,
      officialTotal,
      actualCount,
      uniqueCount,
      statsSum,
      duration,
    },
  }
}

function normalizeSpot(raw: RawSpotItem): SpotItem {
  // 清洗名称：去掉末尾的年份（如"连云港市连岛景区2024年" → "连云港市连岛景区"）
  // 年份信息已单独存放在 year 字段，名称中无需重复
  const cleanedName = stripTrailingYear(raw.name || '')
  return {
    id: raw.id,
    name: cleanedName,
    province: raw.province,
    provinceName: raw.provinceName || PROVINCE_CODE_TO_NAME[raw.province] || '',
    year: raw.year ?? null,
    grade: raw.grade ?? null,
    batch: raw.batch ?? 0,
    place: raw.place ?? null,
    created_at: raw.created_at,
  }
}

/**
 * 去掉名称末尾的年份后缀
 * 支持格式：2024年 / 2024 / 二〇二四年
 */
function stripTrailingYear(name: string): string {
  if (!name) return name
  // 匹配末尾的"XXXX年"或"XXXX"（4位数字）
  // 中文年份（二〇二四年）也处理
  return name
    .replace(/\d{4}年$/, '')
    .replace(/[二〇一二三四五六七八九]{4}年$/, '')
    .trim()
}

/**
 * 获取数据集（命中缓存直接返回，否则抓取后写入缓存）
 * 如果完整性校验未通过，会重试抓取 MAX_DATASET_RETRIES 次
 */
export async function getDataset(typeId: number, forceRefresh = false): Promise<DatasetPayload> {
  // 1. 缓存命中检查
  if (!forceRefresh) {
    const cached = await db.mctDatasetCache.findUnique({ where: { typeId } })
    if (cached) {
      const age = Date.now() - cached.fetchedAt.getTime()
      if (age < CACHE_TTL_MS) {
        const payload = JSON.parse(cached.payload) as DatasetPayload
        // 缓存命中也校验完整性
        if (payload.integrity?.passed !== false) {
          return payload
        }
        console.warn(
          `[fetcher] type=${typeId} cached data integrity failed, will re-fetch`,
        )
      }
    }
  }

  // 2. 重新抓取（带整轮重试）
  let lastError: Error | null = null
  let bestPayload: DatasetPayload | null = null
  for (let attempt = 0; attempt <= MAX_DATASET_RETRIES; attempt++) {
    try {
      const payload = await fetchDataset(typeId)
      if (payload.integrity.passed) {
        // 完整性通过，写入缓存
        await db.mctDatasetCache.upsert({
          where: { typeId },
          create: {
            typeId,
            typeName: payload.typeName,
            payload: JSON.stringify(payload),
            total: payload.total,
          },
          update: {
            typeName: payload.typeName,
            payload: JSON.stringify(payload),
            total: payload.total,
            fetchedAt: new Date(),
          },
        })
        return payload
      }
      // 完整性未通过，但保留抓到最多的那一份作为备选
      if (!bestPayload || payload.actualCount > bestPayload.actualCount) {
        bestPayload = payload
      }
      console.warn(
        `[fetcher] type=${typeId} integrity failed (attempt ${attempt + 1}/${MAX_DATASET_RETRIES + 1}): ${payload.actualCount}/${payload.officialTotal}`,
      )
      lastError = new Error(
        `Integrity check failed: actual=${payload.actualCount}, official=${payload.officialTotal}`,
      )
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.error(`[fetcher] type=${typeId} fetch failed (attempt ${attempt + 1}):`, e)
    }
    if (attempt < MAX_DATASET_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }

  // 3. 所有重试都失败
  // 3a. 若有旧缓存且完整性通过，降级返回旧数据
  const cached = await db.mctDatasetCache.findUnique({ where: { typeId } })
  if (cached) {
    const oldPayload = JSON.parse(cached.payload) as DatasetPayload
    if (oldPayload.integrity?.passed) {
      console.warn(
        `[fetcher] type=${typeId} all retries failed, falling back to valid stale cache (total=${oldPayload.total})`,
      )
      return oldPayload
    }
  }
  // 3b. 若有本次抓到的最好结果，返回它（标记为完整性未通过）
  if (bestPayload) {
    console.warn(
      `[fetcher] type=${typeId} returning best-effort payload: ${bestPayload.actualCount}/${bestPayload.officialTotal}`,
    )
    return bestPayload
  }
  // 3c. 最后降级到旧缓存（即使完整性不通过）
  if (cached) {
    console.warn(`[fetcher] type=${typeId} falling back to stale cache (integrity unknown)`)
    return JSON.parse(cached.payload) as DatasetPayload
  }

  throw lastError || new Error(`Failed to fetch dataset ${typeId}`)
}

/** 并发抓取所有数据集 */
export async function getAllDatasets(forceRefresh = false): Promise<DatasetPayload[]> {
  const typeIds = Object.keys(DATASET_MAP).map(Number)
  // 限制并发为 3，避免压垮源站
  const results: DatasetPayload[] = []
  for (let i = 0; i < typeIds.length; i += 3) {
    const batch = typeIds.slice(i, i + 3)
    const items = await Promise.all(
      batch.map((id) =>
        getDataset(id, forceRefresh).catch((e) => {
          console.error(`Failed to fetch dataset ${id}:`, e)
          return null
        }),
      ),
    )
    for (const item of items) {
      if (item) results.push(item)
    }
  }
  return results
}
