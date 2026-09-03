import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 매직링크 클릭 후 도착하는 콜백. Supabase가 붙여주는 ?code=를 세션으로 교환한다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
