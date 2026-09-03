import { createClient } from '@/lib/supabase/server'
import { combineLoggedMovie, type LoggedMovieRow, type ViewingRow } from '@/lib/loggedMovies'
import type { Movie } from '@/data/movies'

/** page.tsx와 opengraph-image.tsx가 같은 조회 로직을 공유한다 — 카드 slug 하나로
 * "그 영화 한 편 + 그 영화의 감상 기록"만 가져온다(0004의 좁은 공개 범위). */
export async function fetchCardMovie(slug: string): Promise<Movie | null> {
  const supabase = await createClient()

  const { data: link } = await supabase
    .from('movie_share_links')
    .select('logged_movie_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!link) return null

  const { data: row } = await supabase
    .from('logged_movies')
    .select('id, tmdb_id, title, year, director, genres, themes, moods, poster_path')
    .eq('id', link.logged_movie_id)
    .maybeSingle()

  if (!row) return null

  const { data: viewingRows } = await supabase
    .from('viewings')
    .select('id, logged_movie_id, rating, note, watched_at')
    .eq('logged_movie_id', link.logged_movie_id)

  return combineLoggedMovie(row as LoggedMovieRow, (viewingRows ?? []) as ViewingRow[])
}
