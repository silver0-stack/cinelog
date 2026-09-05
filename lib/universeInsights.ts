import type { Movie } from '@/data/movies'

export type UniverseInsight = {
  label: string
  value: string
  detail: string
  /** 이 인사이트에 해당하는 영화 id들 — 탐색 패널에서 누르면 이 목록만
   * 밝히고 나머지는 어둡게 하는 "하이라이트"에 쓴다. 재배치는 하지 않는다
   * (위치는 항상 중심과의 관계로만 정해진다는 규칙을 그대로 지킨다). */
  movieIds: string[]
}

// 리스트형 아카이빙 서비스가 구조적으로 못 보여주는 것 — 항목이 아니라 항목
// 사이의 관계가 만드는 패턴. gravity 계산에 실제로 쓰이는 축(감독/장르/시대)에
// 평점을 더해 요약한다. 표본이 너무 적으면(3편 미만) 패턴이라 부르기 어려우니
// 빈 배열을 준다.
function topEntry<K>(groups: Map<K, string[]>): [K, string[]] | null {
  let best: [K, string[]] | null = null
  for (const entry of groups) {
    if (!best || entry[1].length > best[1].length) best = entry
  }
  return best
}

export function summarizeUniverse(movies: Movie[]): UniverseInsight[] {
  if (movies.length < 3) return []

  const directors = new Map<string, string[]>()
  const genres = new Map<string, string[]>()
  const eras = new Map<string, string[]>()
  const ratings = new Map<number, string[]>()

  for (const movie of movies) {
    if (movie.director) {
      const list = directors.get(movie.director) ?? []
      list.push(movie.id)
      directors.set(movie.director, list)
    }
    for (const genre of movie.genres) {
      const list = genres.get(genre) ?? []
      list.push(movie.id)
      genres.set(genre, list)
    }
    if (movie.era) {
      const list = eras.get(movie.era) ?? []
      list.push(movie.id)
      eras.set(movie.era, list)
    }
    if (movie.rating != null) {
      const list = ratings.get(movie.rating) ?? []
      list.push(movie.id)
      ratings.set(movie.rating, list)
    }
  }

  const insights: UniverseInsight[] = []

  const topDirector = topEntry(directors)
  if (topDirector && topDirector[1].length >= 2) {
    insights.push({ label: '가장 짙은 중력', value: topDirector[0], detail: `${topDirector[1].length}편`, movieIds: topDirector[1] })
  }

  const topGenre = topEntry(genres)
  if (topGenre && topGenre[1].length >= 2) {
    insights.push({ label: '가장 흔한 결', value: topGenre[0], detail: `${topGenre[1].length}편`, movieIds: topGenre[1] })
  }

  const topEra = topEntry(eras)
  if (topEra && topEra[1].length >= 2) {
    insights.push({ label: '가장 머무른 시대', value: topEra[0], detail: `${topEra[1].length}편`, movieIds: topEra[1] })
  }

  const topRating = topEntry(ratings)
  if (topRating && topRating[1].length >= 2) {
    const stars = '★'.repeat(topRating[0]) + '☆'.repeat(5 - topRating[0])
    insights.push({ label: '가장 많이 준 평점', value: stars, detail: `${topRating[1].length}편`, movieIds: topRating[1] })
  }

  return insights
}

export type RewatchedMovie = { id: string; title: string; count: number }

// 시간이 지나면 어떤 영화에 감상(다시보기) 타래가 몇 개 쌓여있는지 스스로도
// 기억이 안 난다는 피드백 — 포스터를 하나하나 열어보지 않고도 한곳에서 볼 수
// 있게 한다. 개수 많은 순으로, 너무 길어지지 않게 상위 몇 개만 추린다.
export function rewatchedMovies(movies: Movie[]): RewatchedMovie[] {
  return movies
    .filter((m) => (m.viewings?.length ?? 0) > 1)
    .map((m) => ({ id: m.id, title: m.title, count: m.viewings!.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}
