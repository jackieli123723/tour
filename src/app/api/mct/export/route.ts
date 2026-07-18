import { NextRequest, NextResponse } from 'next/server'
import { getDataset } from '@/lib/mct/fetcher'
import { DATASET_MAP } from '@/lib/mct/datasets'

export const dynamic = 'force-dynamic'

/** GET /api/mct/export?type=10 - 导出 CSV */
export async function GET(req: NextRequest) {
  const typeId = Number(req.nextUrl.searchParams.get('type'))
  if (!typeId || !DATASET_MAP[typeId]) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  }
  try {
    const payload = await getDataset(typeId)
    const meta = DATASET_MAP[typeId]
    // CSV header
    const rows: string[] = [
      ['序号', '名称', '省份', '年份', '批次', '地点', '录入时间'].join(','),
    ]
    payload.spots.forEach((s, i) => {
      const cells = [
        String(i + 1),
        csvCell(stripTrailingYear(s.name)),
        csvCell(s.provinceName || ''),
        csvCell(s.year || ''),
        csvCell(s.batch ? `第${s.batch}批` : ''),
        csvCell(s.place || ''),
        csvCell(s.created_at || ''),
      ]
      rows.push(cells.join(','))
    })
    const csv = '\uFEFF' + rows.join('\n') // BOM for Excel
    const filename = encodeURIComponent(`${meta.name}-${new Date().toISOString().slice(0, 10)}.csv`)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Export failed' },
      { status: 500 },
    )
  }
}

function csvCell(s: string): string {
  if (!s) return ''
  // 包含逗号、换行、引号则需要转义
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
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
