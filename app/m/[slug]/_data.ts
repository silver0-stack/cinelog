import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { combineLoggedMovie, type LoggedMovieRow, type ViewingRow } from '@/lib/loggedMovies'
import type { Movie } from '@/data/movies'

/** page.tsx와 opengraph-image.tsx가 같은 조회 로직을 공유한다 — 카드 slug 하나로
 * "그 영화 한 편 + 그 영화의 감상 기록"만 가져온다(0004의 좁은 공개 범위).
 * 공개 페이지라 세션이 필요 없다 — createPublicClient(쿠키 안 읽음)를 쓴다.
 * download-image/route.tsx(저장 버튼)는 항상 최신이어야 하므로 이 함수를
 * 캐시 없이 직접 부른다 — 캐시가 필요한 곳은 아래 getCachedCardMovie를 쓴다. */
export async function fetchCardMovie(slug: string): Promise<Movie | null> {
  const supabase = createPublicClient()

  const { data: row } = await supabase.rpc('get_shared_movie_card', { p_slug: slug }).maybeSingle()

  if (!row) return null

  const { data: viewingRows } = await supabase.rpc('get_shared_movie_card_viewings', { p_slug: slug })

  return combineLoggedMovie(row as LoggedMovieRow, (viewingRows ?? []) as ViewingRow[])
}

// revalidate route 설정은 fetch()에만 적용되고 Supabase 클라이언트 호출에는
// 안 먹는다(Next 공식 문서) — page.tsx/opengraph-image.tsx처럼 최신성보다
// 반복 조회 비용 절감이 더 중요한 곳은 이 캐시된 버전을 쓴다. 바이럴로 같은
// 카드 링크에 요청(사람 방문 + 트위터/카톡 크롤러)이 몰릴 때 매번 Supabase를
// 다시 안 부르는 게 핵심.
export const getCachedCardMovie = unstable_cache(fetchCardMovie, ['shared-movie-card'], { revalidate: 60 })
