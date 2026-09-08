import { createClient } from '@/lib/supabase/client'

function randomSlug(): string {
  // crypto.randomUUID는 대시가 섞여 길고 안 예쁘다 — 앞 두 조각만 이어붙여서
  // 충분히 무작위하면서도 링크로 붙여넣기 편한 길이로 줄인다.
  const raw = crypto.randomUUID().replace(/-/g, '')
  return raw.slice(0, 16)
}

/** 이미 공유 링크가 있으면 그 slug를, 없으면 새로 만들어서 반환한다. `created`는
 * 유입 추적(UTM 문서 4번)에서 "새로 생성"과 "이미 있던 링크 재사용"을 구분하는 데 쓴다. */
export async function getOrCreateShareSlug(): Promise<{ slug: string; created: boolean }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')

  const { data: existing } = await supabase
    .from('share_links')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return { slug: existing.slug, created: false }

  const slug = randomSlug()
  const { error } = await supabase.from('share_links').insert({ user_id: user.id, slug })
  if (error) throw error

  return { slug, created: true }
}
