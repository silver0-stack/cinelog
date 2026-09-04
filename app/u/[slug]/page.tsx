import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MovieUniverse } from '@/components/universe/MovieUniverse'
import { FadeIn } from '@/components/archive/FadeIn'
import { combineLoggedMovies, type LoggedMovieRow, type ViewingRow } from '@/lib/loggedMovies'
import { attachEditorialConnections, type EditorialConnectionRow } from '@/lib/editorialConnections'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { secondaryNavLinkClass as loginLinkClass } from '@/lib/uiStyles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 비동기 공유 링크의 읽기 전용 뷰(P2-8). 로그인 없이도 볼 수 있고, 드래그로
// 관계를 조정하는 건 여기서는 안 된다 — editable을 아예 안 켠다.
export default async function SharedUniversePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: link } = await supabase.from('share_links').select('user_id').eq('slug', slug).maybeSingle()

  if (!link) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
        <p className="text-xs font-light tracking-widest text-white/40">링크를 찾을 수 없어.</p>
        <Link href="/" className={loginLinkClass}>
          CINELOG
        </Link>
      </main>
    )
  }

  const { data } = await supabase.rpc('get_shared_universe_movies', { p_slug: slug })

  const rows = (data ?? []) as LoggedMovieRow[]

  if (rows.length === 0) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
        <p className="text-xs font-light tracking-widest text-white/40">아직 기록된 영화가 없어.</p>
        <Link href="/" className={loginLinkClass}>
          CINELOG
        </Link>
      </main>
    )
  }

  const [{ data: viewingData }, { data: connectionData }] = await Promise.all([
    supabase.rpc('get_shared_universe_viewings', { p_slug: slug }),
    supabase.rpc('get_shared_universe_connections', { p_slug: slug }),
  ])

  const movies = attachEditorialConnections(
    combineLoggedMovies(rows, (viewingData ?? []) as ViewingRow[]),
    (connectionData ?? []) as EditorialConnectionRow[],
  )

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <FadeIn>
        <MovieUniverse movies={movies} defaultCenterId={movies[0].id} showIdleHint />
      </FadeIn>
      <GuidePanel
        variant="shared"
        triggerClassName="absolute right-6 top-6 z-10 text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
      />
      <Link href="/login" className={`absolute bottom-6 right-6 z-10 ${loginLinkClass}`}>
        나도 기록하기
      </Link>
    </main>
  )
}
