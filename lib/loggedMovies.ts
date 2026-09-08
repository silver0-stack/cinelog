import { createClient } from '@/lib/supabase/client'
import type { Movie, MovieViewing } from '@/data/movies'

export type LoggedMovieRow = {
  id: string
  tmdb_id: number | null
  title: string
  year: number
  director: string | null
  genres: string[]
  themes: string[]
  moods: string[]
  poster_path: string | null
  /** 유저가 드래그로 직접 배치한 좌표 — 둘 다 null이면 아직 한 번도 안 옮긴
   * 영화라는 뜻이고, MovieUniverse가 자동 배치로 기본 위치를 계산한다. */
  pos_x: number | null
  pos_y: number | null
}

export type ViewingRow = {
  id: string
  logged_movie_id: string
  rating: number | null
  note: string | null
  watched_at: string
}

// STEP 8 gravity 로직(calculateMovieGravity)을 그대로 재사용하기 위해 LoggedMovie
// 행을 V1의 Movie 셰이프로 맞춘다 (P2-3). era/locations는 LoggedMovie에 없는
// 필드라 year에서 파생하거나 빈 값으로 채운다 — gravity 계산에서 그만큼만
// 느슨해지고, director/genre가 여전히 배치의 중심축이 된다.
//
// rating/note는 더 이상 이 행에 없다 — 같은 영화를 다시 봤을 때 감상이 달라질 수
// 있어서, "덮어쓰기"가 아니라 viewings(감상 하나하나의 기록)로 따로 쌓는다. 여기서는
// 가장 최근 감상을 movie.rating/movie.note로 노출해 기존 소비자(gravity, 광채 등)를
// 그대로 재사용하고, 전체 이력은 movie.viewings에 최신순으로 담는다.
export function combineLoggedMovie(row: LoggedMovieRow, viewings: ViewingRow[]): Movie {
  const sorted = [...viewings].sort((a, b) => (a.watched_at < b.watched_at ? 1 : -1))
  const latest = sorted[0] as ViewingRow | undefined

  const movieViewings: MovieViewing[] = sorted.map((v) => ({
    id: v.id,
    rating: v.rating ?? undefined,
    note: v.note ?? undefined,
    watchedAt: v.watched_at,
  }))

  return {
    id: row.id,
    title: row.title,
    year: row.year,
    director: row.director ?? '',
    genres: row.genres,
    themes: row.themes,
    moods: row.moods,
    era: `${Math.floor(row.year / 10) * 10}s`,
    locations: [],
    rating: latest?.rating ?? undefined,
    posterPath: row.poster_path ?? undefined,
    note: latest?.note ?? undefined,
    viewings: movieViewings,
    posX: row.pos_x ?? undefined,
    posY: row.pos_y ?? undefined,
  }
}

/** 아카이브를 "가장 최근에 본 영화가 먼저" 순서로 보여주기 위한 정렬 키. */
export function latestWatchedAt(movie: Movie): string {
  return movie.viewings?.[0]?.watchedAt ?? ''
}

/** "우주 성장 히스토리" 스크럽에서 이 영화가 언제 우주에 처음 나타났는지 —
 * viewings는 항상 최신순 정렬이므로 마지막 항목이 가장 이른 감상이다. */
export function firstWatchedAt(movie: Movie): string {
  const viewings = movie.viewings
  return viewings && viewings.length > 0 ? viewings[viewings.length - 1].watchedAt : ''
}

// 기록이 이 미만이면 "우주 성장 히스토리" 리플레이가 허전해 보인다는 CLAUDE.md의
// 리스크 판단(5~10편 미만)에 따라, 메뉴 자체를 숨긴다. archive/데모/공유 우주
// 셋 다 같은 기준을 쓴다.
export const MIN_HISTORY_MOVIES = 8

/** "우주 성장 히스토리" 스크럽 가능 범위 — 레이아웃은 그대로 두고 firstWatchedAt만
 * 기준으로 삼으므로 순수 계산이다. archive/데모/공유 우주 셋 다 같은 로직을 쓴다. */
export function computeHistoryRange(movies: Movie[]): { min: string; max: string } | null {
  if (movies.length < MIN_HISTORY_MOVIES) return null
  const dates = movies.map(firstWatchedAt).filter(Boolean).sort()
  if (dates.length === 0) return null
  return { min: dates[0], max: dates[dates.length - 1] }
}

/**
 * logged_movies 행들과 viewings 행들을 합쳐서 Movie[]로 만든다. 순수 함수라(supabase를
 * 직접 호출하지 않는다) /archive와 /u/[slug] 양쪽 서버 컴포넌트에서 그대로 재사용한다.
 */
export function combineLoggedMovies(rows: LoggedMovieRow[], viewingRows: ViewingRow[]): Movie[] {
  const viewingsByMovie = new Map<string, ViewingRow[]>()
  for (const viewing of viewingRows) {
    const list = viewingsByMovie.get(viewing.logged_movie_id) ?? []
    list.push(viewing)
    viewingsByMovie.set(viewing.logged_movie_id, list)
  }

  return rows
    .map((row) => combineLoggedMovie(row, viewingsByMovie.get(row.id) ?? []))
    .sort((a, b) => (latestWatchedAt(a) < latestWatchedAt(b) ? 1 : -1))
}

export type NewLoggedMovie = {
  tmdbId: number | null
  title: string
  year: number
  director: string | null
  genres: string[]
  posterPath: string | null
  rating: number | null
  note: string | null
  watchedAt: string
}

// 작품 메타데이터(logged_movies)와 첫 감상(viewings)을 함께 만든다. 하나의 트랜잭션은
// 아니지만, 감상 insert가 실패하면 방금 만든 작품 행을 지워서 "감상 없는 작품"이
// 남지 않게 한다 — latestWatchedAt/combineLoggedMovie가 항상 최소 1개의 viewing을
// 전제하기 때문이다.
export async function createLoggedMovie(input: NewLoggedMovie) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('로그인이 필요해요')

  const { data: movie, error: movieError } = await supabase
    .from('logged_movies')
    .insert({
      user_id: user.id,
      tmdb_id: input.tmdbId,
      title: input.title,
      year: input.year,
      director: input.director,
      genres: input.genres,
      poster_path: input.posterPath,
    })
    .select('id')
    .single()

  if (movieError) throw movieError

  const { error: viewingError } = await supabase.from('viewings').insert({
    user_id: user.id,
    logged_movie_id: movie.id,
    rating: input.rating,
    note: input.note,
    watched_at: input.watchedAt,
  })

  if (viewingError) {
    await supabase.from('logged_movies').delete().eq('id', movie.id)
    throw viewingError
  }

  return movie.id as string
}

export type NewViewing = {
  rating: number | null
  note: string | null
  watchedAt: string
}

/** 같은 영화를 다시 봤을 때 — 기존 감상을 덮어쓰지 않고 새 감상을 하나 더 쌓는다. */
export async function addViewing(loggedMovieId: string, input: NewViewing) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')

  const { error } = await supabase.from('viewings').insert({
    user_id: user.id,
    logged_movie_id: loggedMovieId,
    rating: input.rating,
    note: input.note,
    watched_at: input.watchedAt,
  })

  if (error) throw error
}

export type ViewingUpdate = {
  rating: number | null
  note: string | null
  watchedAt: string
}

/** 이미 남긴 감상(평점/한줄메모/날짜)을 고친다 — 잘못 입력했을 때를 위한 것. */
export async function updateViewing(viewingId: string, input: ViewingUpdate) {
  const supabase = createClient()

  const { error } = await supabase
    .from('viewings')
    .update({ rating: input.rating, note: input.note, watched_at: input.watchedAt })
    .eq('id', viewingId)

  if (error) throw error
}

/** 감상 하나를 지운다. 그 영화의 마지막 남은 감상은 호출부에서 지우지 못하게 막는다 —
 * combineLoggedMovie/latestWatchedAt이 항상 최소 1개의 viewing을 전제하기 때문이다. */
export async function deleteViewing(viewingId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('viewings').delete().eq('id', viewingId)
  if (error) throw error
}

export type MovieMetadataUpdate = {
  title: string
  year: number
  director: string | null
  genres: string[]
  /** TMDB에서 다시 검색해서 골랐을 때만 넘어온다 — 그렇지 않으면 기존 tmdb_id/포스터를 그대로 둔다. */
  tmdbId?: number
  posterPath?: string | null
}

/** 감상이 아니라 작품 정보 자체(제목/연도/감독/장르)를 고친다 — 잘못 입력했을 때를 위한 것. */
export async function updateLoggedMovie(id: string, input: MovieMetadataUpdate) {
  const supabase = createClient()

  const payload: Record<string, unknown> = {
    title: input.title,
    year: input.year,
    director: input.director,
    genres: input.genres,
  }
  if (input.tmdbId !== undefined) {
    payload.tmdb_id = input.tmdbId
    payload.poster_path = input.posterPath ?? null
  }

  const { error } = await supabase.from('logged_movies').update(payload).eq('id', id)

  if (error) throw error
}

/** 별을 드래그해서 우주 안 자리를 직접 정했을 때 그 좌표를 저장한다 — 저장되고
 * 나면 이 영화는 다시는 자동 배치로 안 돌아가고, 이 좌표를 그대로 쓴다. */
export async function updateMoviePosition(id: string, x: number, y: number) {
  const supabase = createClient()
  const { error } = await supabase.from('logged_movies').update({ pos_x: x, pos_y: y }).eq('id', id)
  if (error) throw error
}
