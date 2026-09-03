import { NextResponse } from 'next/server'
import { searchMovies } from '@/lib/tmdb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() ?? ''

  if (query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchMovies(query)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'TMDB 검색에 실패했어' }, { status: 502 })
  }
}
