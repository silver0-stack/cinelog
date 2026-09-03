import { NextResponse } from 'next/server'
import { getMovieDetail } from '@/lib/tmdb'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tmdbId = Number(id)

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: '잘못된 id야' }, { status: 400 })
  }

  try {
    const detail = await getMovieDetail(tmdbId)
    return NextResponse.json(detail)
  } catch {
    return NextResponse.json({ error: 'TMDB 상세 조회에 실패했어' }, { status: 502 })
  }
}
