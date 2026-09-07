import type { Movie } from '@/data/movies'
import { GENRE_CHIPS } from '@/data/genreChips'
import { t } from '@/lib/i18n/dictionary'
import type { Locale } from '@/lib/i18n/locale'

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

export function summarizeUniverse(movies: Movie[], locale: Locale = 'ko'): UniverseInsight[] {
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

  const filmCount = (n: number) => t(locale, 'insight.filmCount', { count: n })

  const topDirector = topEntry(directors)
  if (topDirector && topDirector[1].length >= 2) {
    insights.push({ label: t(locale, 'insight.topDirector'), value: topDirector[0], detail: filmCount(topDirector[1].length), movieIds: topDirector[1] })
  }

  const topGenre = topEntry(genres)
  if (topGenre && topGenre[1].length >= 2) {
    insights.push({ label: t(locale, 'insight.topGenre'), value: t(locale, `genre.${topGenre[0]}`), detail: filmCount(topGenre[1].length), movieIds: topGenre[1] })
  }

  const topEra = topEntry(eras)
  if (topEra && topEra[1].length >= 2) {
    insights.push({ label: t(locale, 'insight.topEra'), value: topEra[0], detail: filmCount(topEra[1].length), movieIds: topEra[1] })
  }

  const topRating = topEntry(ratings)
  if (topRating && topRating[1].length >= 2) {
    const stars = '★'.repeat(topRating[0]) + '☆'.repeat(5 - topRating[0])
    insights.push({ label: t(locale, 'insight.topRating'), value: stars, detail: filmCount(topRating[1].length), movieIds: topRating[1] })
  }

  return insights
}

// 탐색 패널의 장르 필터 칩 — 이 우주에 실제로 1편이라도 있는 장르만 돌려준다
// (빈 칩을 보여줘봐야 눌러도 아무것도 안 밝아지니 의미가 없다). 순서는
// GENRE_CHIPS 고정 목록을 따라서, 우주마다 칩이 들쭉날쭉 재배열되지 않게 한다.
export function genreIndex(movies: Movie[]): { genre: string; movieIds: string[] }[] {
  const map = new Map<string, string[]>()
  for (const movie of movies) {
    for (const genre of movie.genres) {
      const list = map.get(genre) ?? []
      list.push(movie.id)
      map.set(genre, list)
    }
  }
  return GENRE_CHIPS.filter((genre) => map.has(genre)).map((genre) => ({ genre, movieIds: map.get(genre)! }))
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
