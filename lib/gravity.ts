import type { Movie } from '@/data/movies'

// 관계 점수(0~1)를 만드는 가중치. CLAUDE.md의 기준을 따른다:
// 같은 감독 = 강한 관계, 공통 테마 2개 = 중간 정도 관계, 공통 장르 1개 = 약한 관계.
// 실제 값은 여기서만 조정하면 된다.
const WEIGHTS = {
  sameDirector: 0.45,
  theme: 0.15,
  genre: 0.12,
  mood: 0.08,
  sameEra: 0.06,
  location: 0.06,
}

function sharedCount(a: string[], b: string[]): number {
  const setB = new Set(b)
  return a.filter((value) => setB.has(value)).length
}

function editorialStrength(a: Movie, b: Movie): number {
  const forward = a.editorialConnections?.find((c) => c.movieId === b.id)?.strength ?? 0
  const backward = b.editorialConnections?.find((c) => c.movieId === a.id)?.strength ?? 0
  return Math.max(forward, backward)
}

/** editorialStrength과 같은 방향으로 찾되, 그 연결에 남긴 큐레이터 노트를 돌려준다. */
export function editorialReason(a: Movie, b: Movie): string | undefined {
  return (
    a.editorialConnections?.find((c) => c.movieId === b.id)?.reason ??
    b.editorialConnections?.find((c) => c.movieId === a.id)?.reason
  )
}

/**
 * 두 영화 사이의 "중력" — 관계가 강할수록 1에 가깝다.
 * 자동 계산(감독/장르/테마/무드/시대/지역) + editorial connection을 더해서 만든다.
 */
export function calculateMovieGravity(a: Movie, b: Movie): number {
  if (a.id === b.id) return 0

  let score = 0
  if (a.director === b.director) score += WEIGHTS.sameDirector
  score += sharedCount(a.genres, b.genres) * WEIGHTS.genre
  score += sharedCount(a.themes, b.themes) * WEIGHTS.theme
  score += sharedCount(a.moods, b.moods) * WEIGHTS.mood
  if (a.era === b.era) score += WEIGHTS.sameEra
  score += sharedCount(a.locations, b.locations) * WEIGHTS.location

  score += editorialStrength(a, b)

  return Math.min(1, score)
}

// 관계가 약한(공통 장르 1개보다도 못한) 상대는 "관련 있다"고 부르기엔 노이즈에
// 가깝다 — 우주 전체가 서로 옅게라도 다 이어져 있다고 하면 "관련 영화"라는
// 말 자체가 무의미해진다.
const RELATED_THRESHOLD = 0.1

/**
 * 이 영화와 다른 모든 영화의 관계를 강한 순으로 정렬해서 돌려준다(2026-09-06,
 * "중심 영화" 개념을 없애면서 추가). 특정 한 편을 중심으로 삼는 대신, 각
 * 영화가 "우주 전체에서 가장 강하게 이어진 상대가 누구인가"로 자기 자리를
 * 정하게 하려고 만들었다 — MovieUniverse의 반지름 계산과 "관련 영화" 하이라이트
 * 둘 다 이 함수 하나로 처리한다.
 */
export function relatedMovies(movie: Movie, all: Movie[]): { movie: Movie; gravity: number }[] {
  return all
    .filter((m) => m.id !== movie.id)
    .map((m) => ({ movie: m, gravity: calculateMovieGravity(movie, m) }))
    .filter((r) => r.gravity >= RELATED_THRESHOLD)
    .sort((a, b) => b.gravity - a.gravity)
}
