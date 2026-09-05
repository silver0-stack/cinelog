import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // /u/[slug], /m/[slug]는 로그인 세션이 필요 없는 완전 공개 페이지다 — 여기서도
  // 세션 쿠키를 갱신하면 매 요청마다 Set-Cookie가 붙어서 그 페이지의 revalidate
  // 캐시가 전혀 안 먹는다(바이럴로 같은 링크에 요청이 몰릴 때 특히 문제가 된다).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|u/|m/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
