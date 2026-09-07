import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { combineLoggedMovies, type LoggedMovieRow, type ViewingRow } from '@/lib/loggedMovies'
import { attachEditorialConnections, type EditorialConnectionRow } from '@/lib/editorialConnections'
import { combineUniverseTexts } from '@/lib/universeTexts'
import { AccountMenu } from '@/components/archive/AccountMenu'
import { ArchiveShell } from '@/components/archive/ArchiveShell'
import { summarizeUniverse, rewatchedMovies } from '@/lib/universeInsights'

const navLinkClass =
  'text-xs font-light tracking-[0.2em] sm:tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// 기록을 추가하고 돌아올 때마다 최신 상태를 다시 조회해야 한다 — 캐시된 화면에
// 방금 추가한 기록이 안 보이면 안 되므로 이 라우트는 절대 캐시하지 않는다.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>
}) {
  const { focus } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('logged_movies')
    .select('id, tmdb_id, title, year, director, genres, themes, moods, poster_path, pos_x, pos_y')
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

  const [{ data: viewingData }, { data: connectionData }, { data: shareLink }, { data: cardLinks }, { data: textRows }] =
    await Promise.all([
      supabase.from('viewings').select('id, logged_movie_id, rating, note, watched_at').eq('user_id', user.id),
      supabase.from('editorial_connections').select('movie_a_id, movie_b_id, strength').eq('user_id', user.id),
      supabase.from('share_links').select('slug').eq('user_id', user.id).maybeSingle(),
      supabase.from('movie_share_links').select('logged_movie_id, slug').eq('user_id', user.id),
      supabase.from('universe_texts').select('id, content, pos_x, pos_y, size').eq('user_id', user.id),
    ])

  const texts = combineUniverseTexts(
    (textRows ?? []) as { id: string; content: string; pos_x: number; pos_y: number; size: number }[],
  )

  const movies = attachEditorialConnections(
    combineLoggedMovies(rows, (viewingData ?? []) as ViewingRow[]),
    (connectionData ?? []) as EditorialConnectionRow[],
  )
  const insights = summarizeUniverse(movies)
  const rewatched = rewatchedMovies(movies)
  // 검색은 제목/감독만 필요하다 — 메모·테마 같은 무거운 필드까지 클라이언트로
  // 내려보낼 필요 없다.
  const searchIndex = movies.map((m) => ({ id: m.id, title: m.title, director: m.director }))

  // "정보 수정"에서 다른 이미 기록한 영화와 같은 작품으로 바꾸려는 걸 저장 버튼
  // 누르기 전에 미리 막는 데 쓴다(DB 유니크 제약은 그 뒤의 안전장치).
  const existingByTmdbId: Record<number, string> = {}
  for (const row of rows) {
    if (row.tmdb_id != null) existingByTmdbId[row.tmdb_id] = row.id
  }

  // 이미 공유 링크가 있으면 버튼을 누르기 전에 서버에서 미리 채워둔다 — 클라이언트가
  // 매번 "있는지 확인"하느라 몇 초씩 "만드는 중"으로 보이는 걸 막기 위해서다.
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const initialShareUrl = shareLink ? `${protocol}://${host}/u/${shareLink.slug}` : null

  // 영화 카드 공유도 같은 이유로 미리 채운다 — 이미 링크를 만들어둔 영화를
  // 새로고침 후 다시 열면 매번 "만드는 중"이 뜨던 문제.
  const movieCardUrls: Record<string, string> = {}
  for (const link of (cardLinks ?? []) as { logged_movie_id: string; slug: string }[]) {
    movieCardUrls[link.logged_movie_id] = `${protocol}://${host}/m/${link.slug}`
  }

  return (
    <ArchiveShell
      movies={movies}
      movieCardUrls={movieCardUrls}
      existingByTmdbId={existingByTmdbId}
      initialFocusId={focus ?? null}
      initialShareUrl={initialShareUrl}
      email={user.email ?? ''}
      insights={insights}
      rewatched={rewatched}
      searchIndex={searchIndex}
      texts={texts}
    />
  )
}
