import { NextResponse } from 'next/server'
import { track } from '@vercel/analytics/server'
import { createClient } from '@/lib/supabase/server'

// 매직링크 클릭 후 도착하는 콜백. Supabase가 붙여주는 ?code=를 세션으로 교환한다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 이 콜백은 첫 가입과 재로그인 둘 다에서 똑같이 지나간다 — 계정이 방금
      // 막 만들어졌는지(created_at이 지금과 거의 같은 시각인지)로 "진짜 첫
      // 가입"과 "그냥 다시 로그인"을 구분한다. 이 값이 문서 4번의 "실제 가입
      // 완료"에 해당한다.
      const user = data.user
      if (user) {
        const isNewSignup = Date.now() - new Date(user.created_at).getTime() < 10_000
        track('auth_completed', { is_new_signup: isNewSignup })
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
