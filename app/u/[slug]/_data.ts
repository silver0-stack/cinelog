import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import type { LoggedMovieRow, ViewingRow } from '@/lib/loggedMovies'
import type { EditorialConnectionRow } from '@/lib/editorialConnections'

export type UniverseTextRow = { id: string; content: string; pos_x: number; pos_y: number; size: number }

export type SharedUniverseData = {
  rows: LoggedMovieRow[]
  viewingRows: ViewingRow[]
  connectionRows: EditorialConnectionRow[]
  textRows: UniverseTextRow[]
} | null

// page.tsx와 opengraph-image.tsx가 같은 조회 로직을 공유한다(m/[slug]/_data.ts와
// 같은 이유 — 로직이 갈라지면 페이지와 미리보기 카드가 서로 다른 걸 보여준다).
//
// revalidate route 설정은 fetch() 호출에만 적용된다 — Supabase 클라이언트는
// fetch를 캐시 옵션 없이 쓰기 때문에 이 값 하나만으로는 아무것도 캐시되지
// 않는다(Next 공식 문서: "unstable_cache allows you to cache the result of
// database queries and other async functions that don't use fetch"). 그래서
// 실제 조회를 unstable_cache로 직접 감싼다 — 바이럴로 같은 slug에 요청이
// 몰릴 때(사람 방문 + 트위터/카톡 크롤러) Supabase를 매번 다시 안 부르는 게 핵심.
// slug별로 캐시되고, 1분 정도 지연 반영되는 건 이 페이지 특성상 체감하기 어렵다.
export const getSharedUniverseData = unstable_cache(
  async (slug: string): Promise<SharedUniverseData> => {
    const supabase = createPublicClient()

    const { data: link } = await supabase.from('share_links').select('user_id').eq('slug', slug).maybeSingle()
    if (!link) return null

    const { data } = await supabase.rpc('get_shared_universe_movies', { p_slug: slug })
    const rows = (data ?? []) as LoggedMovieRow[]
    if (rows.length === 0)
      return {
        rows: [] as LoggedMovieRow[],
        viewingRows: [] as ViewingRow[],
        connectionRows: [] as EditorialConnectionRow[],
        textRows: [] as UniverseTextRow[],
      }

    const [{ data: viewingData }, { data: connectionData }, { data: textData }] = await Promise.all([
      supabase.rpc('get_shared_universe_viewings', { p_slug: slug }),
      supabase.rpc('get_shared_universe_connections', { p_slug: slug }),
      supabase.rpc('get_shared_universe_texts', { p_slug: slug }),
    ])

    return {
      rows,
      viewingRows: (viewingData ?? []) as ViewingRow[],
      connectionRows: (connectionData ?? []) as EditorialConnectionRow[],
      textRows: (textData ?? []) as UniverseTextRow[],
    }
  },
  ['shared-universe'],
  { revalidate: 60 },
)
