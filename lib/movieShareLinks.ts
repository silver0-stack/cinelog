import { createClient } from '@/lib/supabase/client'

function randomSlug(): string {
  const raw = crypto.randomUUID().replace(/-/g, '')
  return raw.slice(0, 16)
}

/**
 * 영화 카드 한 장 공유용 slug — 우주 전체 공유(share_links)와 독립적이다(0004).
 * 이미 있으면 그 slug를, 없으면 새로 만들어서 반환한다.
 */
export async function getOrCreateMovieCardSlug(loggedMovieId: string): Promise<string> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해')

  const { data: existing } = await supabase
    .from('movie_share_links')
    .select('slug')
    .eq('logged_movie_id', loggedMovieId)
    .maybeSingle()

  if (existing) return existing.slug

  const slug = randomSlug()
  const { error } = await supabase
    .from('movie_share_links')
    .insert({ user_id: user.id, logged_movie_id: loggedMovieId, slug })

  if (error) throw error

  return slug
}
