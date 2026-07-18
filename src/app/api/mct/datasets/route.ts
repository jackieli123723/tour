import { NextRequest, NextResponse } from 'next/server'
import { DATASETS } from '@/lib/mct/datasets'
import { getDataset } from '@/lib/mct/fetcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET /api/mct/datasets - 获取所有数据集元信息 + 总览统计（含完整性 + 时间） */
export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1'
  const result = await Promise.all(
    DATASETS.map(async (d) => {
      try {
        const payload = await getDataset(d.typeId, forceRefresh)
        return {
          typeId: d.typeId,
          name: d.name,
          shortName: d.shortName,
          description: d.description,
          color: d.color,
          icon: d.icon,
          sourceUrl: d.sourceUrl,
          // 数据量
          total: payload.total,
          officialTotal: payload.officialTotal,
          actualCount: payload.actualCount,
          provinceCount: payload.provinces.length,
          // 时间信息
          fetchedAt: payload.fetchedAt,
          latestRecordAt: payload.latestRecordAt,
          // 完整性
          integrityPassed: payload.integrity.passed,
          integrity: payload.integrity,
        }
      } catch (e) {
        return {
          typeId: d.typeId,
          name: d.name,
          shortName: d.shortName,
          description: d.description,
          color: d.color,
          icon: d.icon,
          sourceUrl: d.sourceUrl,
          total: 0,
          officialTotal: 0,
          actualCount: 0,
          provinceCount: 0,
          fetchedAt: null,
          latestRecordAt: null,
          integrityPassed: false,
          integrity: null,
          error: e instanceof Error ? e.message : 'Unknown error',
        }
      }
    }),
  )

  // 计算总览统计
  const summary = {
    totalDatasets: result.length,
    totalRecords: result.reduce((s, d) => s + (d.total || 0), 0),
    totalOfficial: result.reduce((s, d) => s + (d.officialTotal || 0), 0),
    allIntegrityPassed: result.every((d) => d.integrityPassed),
    lastRefreshAt: result
      .map((d) => d.fetchedAt)
      .filter(Boolean)
      .sort()
      .pop(),
  }

  return NextResponse.json({ datasets: result, summary })
}
