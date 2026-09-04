import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { MovieUniverse } from '@/components/universe/MovieUniverse'
import { FadeIn } from '@/components/archive/FadeIn'
import { combineLoggedMovies, type LoggedMovieRow, type ViewingRow } from '@/lib/loggedMovies'
import { attachEditorialConnections, type EditorialConnectionRow } from '@/lib/editorialConnections'
import { ShareButton } from '@/components/archive/ShareButton'
import { AccountMenu } from '@/components/archive/AccountMenu'
import { UniverseInsightPanel } from '@/components/archive/UniverseInsightPanel'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { summarizeUniverse } from '@/lib/universeInsights'

const navLinkClass =
  'text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// 기록을 추가하고 돌아올 때마다 최신 상태를 다시 조회해야 한다 — 캐시된 화면에
// 방금 추가한 기록이 안 보이면 안 되므로 이 라우트는 절대 캐시하지 않는다.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ArchivePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('logged_movies')
    .select('id, tmdb_id, title, year, director, genres, themes, moods, poster_path')
    .eq('user_id', user.id)

  const rows = (data ?? []) as LoggedMovieRow[]

  if (rows.length === 0) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-8 bg-black">
        <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/40">
          아직 기록한 영화가 없어.
          <br />첫 영화를 기록하면 우주가 시작돼.
        </p>
        <Link href="/archive/new" className={navLinkClass}>
          첫 영화 기록하기
        </Link>
        <div className="absolute right-6 top-6 z-10">
          <AccountMenu email={user.email ?? ''} />
        </div>
      </main>
    )
  }

  const [{ data: viewingData }, { data: connectionData }, { data: shareLink }] = await Promise.all([
    supabase.from('viewings').select('id, logged_movie_id, rating, note, watched_at').eq('user_id', user.id),
    supabase.from('editorial_connections').select('movie_a_id, movie_b_id, strength').eq('user_id', user.id),
    supabase.from('share_links').select('slug').eq('user_id', user.id).maybeSingle(),
  ])

  const movies = attachEditorialConnections(
    combineLoggedMovies(rows, (viewingData ?? []) as ViewingRow[]),
    (connectionData ?? []) as EditorialConnectionRow[],
  )
  const insights = summarizeUniverse(movies)

  // 이미 공유 링크가 있으면 버튼을 누르기 전에 서버에서 미리 채워둔다 — 클라이언트가
  // 매번 "있는지 확인"하느라 몇 초씩 "만드는 중"으로 보이는 걸 막기 위해서다.
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const initialShareUrl = shareLink ? `${protocol}://${host}/u/${shareLink.slug}` : null

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <FadeIn>
        <MovieUniverse movies={movies} defaultCenterId={movies[0].id} editable />
      </FadeIn>
      <div className="absolute right-6 top-6 z-10 flex items-center gap-8">
        <ShareButton initialUrl={initialShareUrl} />
        <Link href="/archive/new" className={navLinkClass}>
          + 기록
        </Link>
        <AccountMenu email={user.email ?? ''} />
      </div>
      <UniverseInsightPanel insights={insights} />
      <GuidePanel
        variant="archive"
        triggerClassName="absolute bottom-6 right-6 z-10 text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
        panelClassName="absolute bottom-14 right-6"
      />
    </main>
  )
}
