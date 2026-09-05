import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 로그인 여부와 무관한 공개 읽기 전용 라우트(/u/[slug], /m/[slug])에서만 쓴다.
// lib/supabase/server.ts의 클라이언트는 매 호출마다 cookies()를 읽는데, 그
// 자체가 Next.js를 "이 라우트는 무조건 매 요청마다 새로 렌더링"으로 강제해서
// revalidate 설정이 있어도 캐시가 전혀 안 먹는다. 이 라우트들은 애초에 세션이
// 필요 없으니(공개 RPC만 호출), 쿠키를 아예 안 읽는 클라이언트로 그 강제
// 다이나믹을 피해서 revalidate가 실제로 동작하게 한다.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
