import type { GenreChip } from '@/data/genreChips'

export type TmdbSearchResult = {
  tmdbId: number
  title: string
  year: number | null
  posterPath: string | null
  genres: GenreChip[]
}

export type TmdbMovieDetail = {
  tmdbId: number
  title: string
  year: number | null
  director: string | null
  posterPath: string | null
  genres: GenreChip[]
}

// 브라우저에서 우리 서버 프록시(app/api/tmdb/*)를 호출한다 — TMDB_API_KEY는 여기서 절대 안 씀.
export async function searchTmdbMovies(query: string): Promise<TmdbSearchResult[]> {
  const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []
  const data = (await res.json()) as { results: TmdbSearchResult[] }
  return data.results
}

export async function fetchTmdbMovieDetail(tmdbId: number): Promise<TmdbMovieDetail | null> {
  const res = await fetch(`/api/tmdb/movie/${tmdbId}`)
  if (!res.ok) return null
  return (await res.json()) as TmdbMovieDetail
}
