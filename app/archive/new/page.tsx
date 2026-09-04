import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogMovieForm } from '@/components/archive/LogMovieForm'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

export default async function NewLoggedMoviePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // TMDB 검색으로 이미 기록한 영화를 고르면, 새 별을 또 만드는 대신 기존 기록으로
  // 안내한다 — 이미 기록한 영화가 뭔지는 검색 단계에서 미리 알아야 하니 여기서
  // 함께 조회해서 내려준다.
  const { data: existing } = await supabase
    .from('logged_movies')
    .select('id, tmdb_id')
    .eq('user_id', user.id)
    .not('tmdb_id', 'is', null)

  const existingByTmdbId: Record<number, string> = {}
  for (const row of (existing ?? []) as { id: string; tmdb_id: number | null }[]) {
    if (row.tmdb_id != null) existingByTmdbId[row.tmdb_id] = row.id
  }

  return (
    <main className="relative flex min-h-dvh w-screen flex-col items-center justify-center gap-16 bg-black px-6 py-16">
      {/* LogMovieForm 내부의 "뒤로"는 검색↔입력 단계 사이만 오간다 — 여기 들어온
          걸 그냥 취소하고 내 우주로 돌아갈 방법이 아예 없었다는 피드백으로 추가했다. */}
      <Link href="/archive" className={`absolute left-6 top-6 ${secondaryNavLinkClass}`}>
        아카이브로
      </Link>
      <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70">
        영화 기록하기
      </h1>
      <LogMovieForm existingByTmdbId={existingByTmdbId} />
    </main>
  )
}
