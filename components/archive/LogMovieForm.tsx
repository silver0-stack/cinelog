'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { searchTmdbMovies, fetchTmdbMovieDetail, type TmdbSearchResult } from '@/lib/tmdbClient'
import { createLoggedMovie } from '@/lib/loggedMovies'
import { GenreChipPicker } from './GenreChipPicker'
import { RatingPicker } from './RatingPicker'

type Draft = {
  tmdbId: number | null
  title: string
  year: string
  director: string
  genres: string[]
  posterPath: string | null
  rating: number | null
  note: string
  watchedAt: string
}

function emptyDraft(): Draft {
  return {
    tmdbId: null,
    title: '',
    year: '',
    director: '',
    genres: [],
    posterPath: null,
    rating: null,
    note: '',
    watchedAt: new Date().toISOString().slice(0, 10),
  }
}

const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-2 text-sm font-light tracking-widest text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

export function LogMovieForm() {
  const [step, setStep] = useState<'search' | 'details' | 'done'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, startSearch] = useTransition()
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleQueryChange(value: string) {
    setQuery(value)
    if (value.trim().length < 1) {
      setResults([])
      return
    }
    startSearch(async () => {
      const found = await searchTmdbMovies(value.trim())
      setResults(found)
    })
  }

  async function selectResult(result: TmdbSearchResult) {
    const detail = await fetchTmdbMovieDetail(result.tmdbId)
    setDraft({
      ...emptyDraft(),
      tmdbId: result.tmdbId,
      title: detail?.title ?? result.title,
      year: String(detail?.year ?? result.year ?? ''),
      director: detail?.director ?? '',
      genres: detail?.genres ?? result.genres,
      posterPath: detail?.posterPath ?? result.posterPath,
    })
    setStep('details')
  }

  function startManual() {
    setDraft(emptyDraft())
    setStep('details')
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const year = Number(draft.year)
    if (!draft.title.trim() || !Number.isInteger(year)) {
      setError('제목과 연도는 채워줘.')
      return
    }

    setSaving(true)
    try {
      await createLoggedMovie({
        tmdbId: draft.tmdbId,
        title: draft.title.trim(),
        year,
        director: draft.director.trim() || null,
        genres: draft.genres,
        posterPath: draft.posterPath,
        rating: draft.rating,
        note: draft.note.trim() || null,
        watchedAt: draft.watchedAt,
      })
      setStep('done')
    } catch {
      setError('저장하지 못했어. 잠시 후 다시 시도해줘.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-8">
        <p className="text-xs font-light tracking-widest text-white/60">{draft.title} 기록했어.</p>
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft())
              setQuery('')
              setResults([])
              setStep('search')
            }}
            className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
          >
            다른 영화 기록하기
          </button>
          <Link
            href="/archive"
            className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
          >
            우주에서 보기
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'search') {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="영화 제목"
          autoFocus
          className={`text-center ${fieldClass}`}
        />

        {searching && <p className="text-xs font-light tracking-widest text-white/30">검색 중</p>}

        {results.length > 0 && (
          <ul className="flex w-full flex-col gap-1">
            {results.map((r) => (
              <li key={r.tmdbId}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="flex w-full items-baseline justify-between gap-4 border-b border-white/5 px-1 py-2 text-left text-sm font-light text-white/70 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white"
                >
                  <span className="tracking-wide">{r.title}</span>
                  <span className="shrink-0 text-xs text-white/30">{r.year ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={startManual}
          className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
        >
          직접 입력할게
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex w-full max-w-sm flex-col items-center gap-8">
      <div className="flex w-full flex-col gap-4">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="제목"
          required
          className={fieldClass}
        />

        <div className="flex gap-4">
          <input
            type="number"
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
            placeholder="연도"
            required
            className={`w-1/2 ${fieldClass}`}
          />
          <input
            type="text"
            value={draft.director}
            onChange={(e) => setDraft((d) => ({ ...d, director: e.target.value }))}
            placeholder="감독"
            className={`w-1/2 ${fieldClass}`}
          />
        </div>
      </div>

      <GenreChipPicker selected={draft.genres} onChange={(genres) => setDraft((d) => ({ ...d, genres }))} />

      <RatingPicker value={draft.rating} onChange={(rating) => setDraft((d) => ({ ...d, rating }))} />

      <textarea
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder="메모 (선택 — 짧게 한 줄이어도, 길게 리뷰여도 괜찮아)"
        rows={3}
        className={`max-h-[40vh] resize-y tracking-wide ${fieldClass}`}
      />

      <input
        type="date"
        value={draft.watchedAt}
        onChange={(e) => setDraft((d) => ({ ...d, watchedAt: e.target.value }))}
        className="border-b border-white/15 bg-transparent px-1 py-2 text-xs font-light tracking-widest text-white/50 outline-none transition-colors duration-500 [color-scheme:dark] focus:border-white/40"
      />

      {error && <p className="text-xs font-light tracking-wider text-white/40">{error}</p>}

      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => setStep('search')}
          className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
        >
          뒤로
        </button>
        <button
          type="submit"
          disabled={saving}
          className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 disabled:text-white/20"
        >
          {saving ? 'SAVING' : 'SAVE'}
        </button>
      </div>
    </form>
  )
}
