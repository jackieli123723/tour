import { NextRequest, NextResponse } from 'next/server'
import { getDataset } from '@/lib/mct/fetcher'
import { DATASET_MAP } from '@/lib/mct/datasets'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET /api/mct/dataset?type=10 - 获取单个数据集的完整数据 */
export async function GET(req: NextRequest) {
  const typeId = Number(req.nextUrl.searchParams.get('type'))
  if (!typeId || !DATASET_MAP[typeId]) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  }
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1'
  try {
    const payload = await getDataset(typeId, forceRefresh)
    return NextResponse.json(payload)
  } catch (e) {
    console.error(`Failed to fetch dataset ${typeId}:`, e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch dataset' },
      { status: 500 },
    )
  }
}
