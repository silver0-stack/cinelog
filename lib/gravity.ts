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
