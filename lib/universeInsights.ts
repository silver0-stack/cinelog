import type { Movie } from '@/data/movies'

export type UniverseInsight = {
  label: string
  value: string
  detail: string
}

// 리스트형 아카이빙 서비스가 구조적으로 못 보여주는 것 — 항목이 아니라 항목
// 사이의 관계가 만드는 패턴. gravity 계산에 실제로 쓰이는 축(감독/장르/시대)만
// 요약한다. 표본이 너무 적으면(3편 미만) 패턴이라 부르기 어려우니 빈 배열을 준다.
function topEntry(counts: Map<string, number>): [string, number] | null {
  let best: [string, number] | null = null
  for (const entry of counts) {
    if (!best || entry[1] > best[1]) best = entry
  }
  return best
}

export function summarizeUniverse(movies: Movie[]): UniverseInsight[] {
  if (movies.length < 3) return []

  const directors = new Map<string, number>()
  const genres = new Map<string, number>()
  const eras = new Map<string, number>()

  for (const movie of movies) {
    if (movie.director) directors.set(movie.director, (directors.get(movie.director) ?? 0) + 1)
    for (const genre of movie.genres) genres.set(genre, (genres.get(genre) ?? 0) + 1)
    if (movie.era) eras.set(movie.era, (eras.get(movie.era) ?? 0) + 1)
  }

  const insights: UniverseInsight[] = []

  const topDirector = topEntry(directors)
  if (topDirector && topDirector[1] >= 2) {
    insights.push({ label: '가장 짙은 중력', value: topDirector[0], detail: `${topDirector[1]}편` })
  }

  const topGenre = topEntry(genres)
  if (topGenre && topGenre[1] >= 2) {
    insights.push({ label: '가장 흔한 결', value: topGenre[0], detail: `${topGenre[1]}편` })
  }

  const topEra = topEntry(eras)
  if (topEra && topEra[1] >= 2) {
    insights.push({ label: '가장 머무른 시대', value: topEra[0], detail: `${topEra[1]}편` })
  }

  return insights
}
