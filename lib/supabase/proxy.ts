import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 매 요청마다 Supabase 세션 쿠키를 갱신한다. 만료된 access token을 여기서
// 갱신해두지 않으면 Server Component에서 읽는 세션이 조용히 stale해진다.
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Supabase 프로젝트가 아직 연결되지 않았다면(.env.local 미설정) V1 정적
  // 유니버스는 로그인 없이도 그대로 동작해야 하므로 세션 갱신을 건너뛴다.
  if (!url || !key) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  await supabase.auth.getUser()

  return response
}
