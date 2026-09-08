import { createClient } from '@/lib/supabase/client'

function randomSlug(): string {
  const raw = crypto.randomUUID().replace(/-/g, '')
  return raw.slice(0, 16)
}

/**
 * 영화 카드 한 장 공유용 slug — 우주 전체 공유(share_links)와 독립적이다(0004).
 * 이미 있으면 그 slug를, 없으면 새로 만들어서 반환한다. `created`는 유입 추적에서
 * "새로 생성"과 "이미 있던 링크 재사용"을 구분하는 데 쓴다.
 */
export async function getOrCreateMovieCardSlug(loggedMovieId: string): Promise<{ slug: string; created: boolean }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')

  const { data: existing } = await supabase
    .from('movie_share_links')
    .select('slug')
    .eq('logged_movie_id', loggedMovieId)
    .maybeSingle()

  if (existing) return { slug: existing.slug, created: false }

  const slug = randomSlug()
  const { error } = await supabase
    .from('movie_share_links')
    .insert({ user_id: user.id, logged_movie_id: loggedMovieId, slug })

  if (error) throw error

  return { slug, created: true }
}
