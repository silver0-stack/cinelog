import { createClient } from '@/lib/supabase/client'
import type { Movie } from '@/data/movies'

export type EditorialConnectionRow = {
  movie_a_id: string
  movie_b_id: string
  strength: number
}

/** 두 영화 id를 항상 같은 순서로 정렬한다 — 어느 쪽이 지금 중심이든 같은 쌍은 같은 행 하나로 유지된다. */
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// editorial_connections는 (movie_a, movie_b) 한 행으로만 저장되지만, gravity 계산은
// 어느 쪽이 중심이 되든 양방향에서 값을 찾을 수 있어야 한다(P2-6) — 그래서 두
// 영화 모두의 editorialConnections에 서로를 가리키는 항목을 미러링해서 붙여준다.
export function attachEditorialConnections(movies: Movie[], rows: EditorialConnectionRow[]): Movie[] {
  const byMovie = new Map<string, { movieId: string; strength: number }[]>()

  for (const row of rows) {
    if (!byMovie.has(row.movie_a_id)) byMovie.set(row.movie_a_id, [])
    if (!byMovie.has(row.movie_b_id)) byMovie.set(row.movie_b_id, [])
    byMovie.get(row.movie_a_id)!.push({ movieId: row.movie_b_id, strength: row.strength })
    byMovie.get(row.movie_b_id)!.push({ movieId: row.movie_a_id, strength: row.strength })
  }

  return movies.map((movie) => {
    const connections = byMovie.get(movie.id)
    return connections ? { ...movie, editorialConnections: connections } : movie
  })
}

// 유저가 별을 드래그해서 조정한 관계 강도를 저장한다. 절대 좌표가 아니라
// "이 두 영화 사이의 관계가 얼마나 강한가" 하나만 저장한다(P2-6).
export async function upsertEditorialConnection(movieIdA: string, movieIdB: string, strength: number) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해')

  const [a, b] = orderPair(movieIdA, movieIdB)

  const { error } = await supabase
    .from('editorial_connections')
    .upsert(
      { user_id: user.id, movie_a_id: a, movie_b_id: b, strength },
      { onConflict: 'user_id,movie_a_id,movie_b_id' }
    )

  if (error) throw error
}
