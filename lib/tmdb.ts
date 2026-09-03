import { mapTmdbGenreIds, type GenreChip } from '@/data/genreChips'

// TMDB_API_KEY는 서버에서만 쓴다 — 브라우저에 노출하지 않기 위해 이 파일은
// route handler에서만 import한다 (P2-1).
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

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

function apiKey(): string {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('TMDB_API_KEY가 설정되지 않았어')
  return key
}

export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const url = new URL(`${TMDB_BASE_URL}/search/movie`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('language', 'ko-KR')
  url.searchParams.set('include_adult', 'false')

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)

  const data = (await res.json()) as {
    results: {
      id: number
      title: string
      release_date: string
      poster_path: string | null
      genre_ids: number[]
    }[]
  }

  return data.results.slice(0, 8).map((r) => ({
    tmdbId: r.id,
    title: r.title,
    year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
    posterPath: r.poster_path,
    genres: mapTmdbGenreIds(r.genre_ids),
  }))
}

export async function getMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${tmdbId}`)
  url.searchParams.set('api_key', apiKey())
  url.searchParams.set('language', 'ko-KR')
  url.searchParams.set('append_to_response', 'credits')

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
  if (!res.ok) throw new Error(`TMDB movie detail failed: ${res.status}`)

  const data = (await res.json()) as {
    id: number
    title: string
    release_date: string
    poster_path: string | null
    genres: { id: number; name: string }[]
    credits?: { crew: { job: string; name: string }[] }
  }

  const director = data.credits?.crew.find((c) => c.job === 'Director')?.name ?? null

  return {
    tmdbId: data.id,
    title: data.title,
    year: data.release_date ? Number(data.release_date.slice(0, 4)) : null,
    director,
    posterPath: data.poster_path,
    genres: mapTmdbGenreIds(data.genres.map((g) => g.id)),
  }
}
