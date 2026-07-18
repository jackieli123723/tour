import { NextRequest, NextResponse } from 'next/server'
import { getAllDatasets } from '@/lib/mct/fetcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

/** POST /api/mct/refresh - 强制刷新所有数据集缓存，返回完整性报告 */
export async function POST() {
  try {
    const datasets = await getAllDatasets(true)
    return NextResponse.json({
      success: true,
      refreshed: datasets.length,
      allIntegrityPassed: datasets.every((d) => d.integrity.passed),
      summary: {
        totalRecords: datasets.reduce((s, d) => s + d.total, 0),
        totalOfficial: datasets.reduce((s, d) => s + d.officialTotal, 0),
        lastRefreshAt: new Date().toISOString(),
      },
      datasets: datasets.map((d) => ({
        typeId: d.typeId,
        typeName: d.typeName,
        total: d.total,
        officialTotal: d.officialTotal,
        actualCount: d.actualCount,
        provinces: d.provinces.length,
        fetchedAt: d.fetchedAt,
        latestRecordAt: d.latestRecordAt,
        integrityPassed: d.integrity.passed,
        duration: d.integrity.duration,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
