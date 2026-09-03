import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomeRitual } from '@/components/entrance/HomeRitual'

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 로그인한 재방문자는 좌석→블랙홀 의식을 다시 거치지 않고 곧장 자신의 우주로
// 들어온다(P2-7) — 첫 방문/비로그인 쇼케이스에서만 의식을 그대로 유지한다.
export default async function RootPage() {
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect('/archive')
    }
  }

  return <HomeRitual />
}
