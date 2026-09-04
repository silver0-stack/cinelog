import { createClient } from '@/lib/supabase/server'
import { HomeRitual } from '@/components/entrance/HomeRitual'

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// 예전엔 로그인한 유저를 여기서 곧장 /archive로 리다이렉트했다 — 근데 로그인한
// 사람도 랜딩 페이지(입장 화면)를 보고 싶을 수 있다는 피드백으로 그 리다이렉트를
// 없앴다. 대신 로그인 여부를 HomeRitual/Entrance에 넘겨서, 우측 상단이 "LOG IN"
// 대신 계정 메뉴("내 우주 가기"/로그아웃)로 바뀌고, "내 우주 만들기" CTA도
// /login이 아니라 /archive로 곧장 가도록 한다.
export default async function RootPage() {
  const userEmail = isSupabaseConfigured ? await getUserEmail() : null

  return <HomeRitual userEmail={userEmail} />
}

async function getUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email ?? null
}
