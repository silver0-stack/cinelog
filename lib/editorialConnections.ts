import type { Movie } from '@/data/movies'

export type EditorialConnectionRow = {
  movie_a_id: string
  movie_b_id: string
  strength: number
}

// editorial_connections는 (movie_a, movie_b) 한 행으로만 저장되지만, gravity 계산은
// 어느 쪽 기준으로 보든 양방향에서 값을 찾을 수 있어야 한다 — 그래서 두 영화
// 모두의 editorialConnections에 서로를 가리키는 항목을 미러링해서 붙여준다.
//
// (2026-09-06) 이 값을 드래그로 직접 조정하는 UI(예전 P2-6, upsertEditorialConnection)는
// "중심 영화" 개념과 함께 없앴다 — 드래그가 항상 "지금 중심과의 관계"를
// 조정하는 거였는데, 중심 자체가 없어지면서 그 기준점을 잃었다. 저장된
// 데이터(과거에 드래그로 남긴 값)는 여전히 gravity 계산에 그대로 반영된다 —
// 이 함수만 그대로 남겨 읽기는 계속 되게 하고, 새로 조정하는 UI는 나중에
// (즐겨찾기처럼 "이 영화 자체가 나한테 특별하다"는 개념과 엮어서) 다시 설계한다.
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
