'use client'

import { useState, useTransition, useRef, type FormEvent } from 'react'
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

type Props = {
  /** tmdbId → 이미 기록한 이 영화의 logged_movie id. 검색 결과를 고를 때 이미
   * 기록한 영화면 새 별을 또 만드는 대신 기존 기록으로 안내하는 데 쓴다. */
  existingByTmdbId?: Record<number, string>
  /** 지정하면(아카이브 화면 위 모달로 쓰일 때) "우주에서 보기"/"그 별로 가기"가
   * `/archive?focus=` 링크 대신 이 콜백으로 즉시 카메라를 옮긴다(서버 왕복
   * 없이). 없으면(/archive/new 단독 페이지로 쓰일 때) 기존처럼 실제 링크로
   * 이동한다. */
  onFocusMovie?: (id: string) => void
  /** 저장에 성공했을 때 한 번 호출된다(모달 모드에서 서버 데이터를 조용히
   * 갱신하는 데 쓴다 — router.refresh()). */
  onSaved?: () => void
}

export function LogMovieForm({ existingByTmdbId = {}, onFocusMovie, onSaved }: Props) {
  const [step, setStep] = useState<'search' | 'details' | 'done'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [searching, startSearch] = useTransition()
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null)
  const searchTokenRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function runSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 1) {
      setPending(false)
      setResults([])
      return
    }
    setPending(true)
    debounceRef.current = setTimeout(() => {
      const token = ++searchTokenRef.current
      startSearch(async () => {
        const found = await searchTmdbMovies(value.trim())
        if (token === searchTokenRef.current) {
          setResults(found)
          setPending(false)
        }
      })
    }, 300)
  }

  // 한글 조합 중에도 브라우저는 e.target.value를 그때그때 업데이트하므로 매 입력마다
  // 그대로 검색을 예약한다 — 디바운스가 타이핑이 멈춘 시점에 자연히 정착시킨다.
  // (조합 중에만 검색을 미루는 방식은 IME/브라우저에 따라 compositionend가 음절마다
  // 안 터지고 스페이스/포커스아웃에서만 터져서 오히려 "스페이스 눌러야 검색됨" 증상을 만든다.)
  function handleQueryChange(value: string) {
    setQuery(value)
    runSearch(value)
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    runSearch(e.currentTarget.value)
  }

  async function selectResult(result: TmdbSearchResult) {
    const existingId = existingByTmdbId[result.tmdbId]
    if (existingId) {
      setDuplicate({ id: existingId, title: result.title })
      return
    }

    if (loadingDetail) return
    setLoadingDetail(true)
    const detail = await fetchTmdbMovieDetail(result.tmdbId).finally(() => setLoadingDetail(false))
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
      const id = await createLoggedMovie({
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
      setSavedId(id)
      setStep('done')
      onSaved?.()
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
          {onFocusMovie ? (
            <button
              type="button"
              onClick={() => savedId && onFocusMovie(savedId)}
              className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
            >
              우주에서 보기
            </button>
          ) : (
            <Link
              href={savedId ? `/archive?focus=${savedId}` : '/archive'}
              className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
            >
              우주에서 보기
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (duplicate) {
    return (
      <div className="flex flex-col items-center gap-8">
        <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/60">
          {duplicate.title}, 이미 기록했어.
          <br />
          다시 봤다면 그 포스터를 열어서 새 감상을 남겨봐.
        </p>
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setDuplicate(null)}
            className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
          >
            다른 영화 검색
          </button>
          {onFocusMovie ? (
            <button
              type="button"
              onClick={() => onFocusMovie(duplicate.id)}
              className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
            >
              그 포스터로 가기
            </button>
          ) : (
            <Link
              href={`/archive?focus=${duplicate.id}`}
              className="text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
            >
              그 포스터로 가기
            </Link>
          )}
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
          onCompositionEnd={handleCompositionEnd}
          placeholder="영화 제목"
          autoFocus
          className={`text-center ${fieldClass}`}
        />

        {/* 결과 목록 바로 위에 조건부로 마운트/언마운트되면, 타이핑 중(한글 조합
            포함) 계속 토글되면서 목록 전체가 위아래로 밀린다 — 클릭하는 순간
            하필 밀리면 엉뚱한 결과를 누르게 된다. 항상 자리를 차지하되 보이기만
            껐다 켜지게 해서 목록 위치가 절대 안 흔들리게 한다. */}
        <p
          className={`text-xs font-light tracking-widest text-white/30 ${
            pending || searching || loadingDetail ? '' : 'invisible'
          }`}
        >
          {loadingDetail ? '불러오는 중' : '검색 중'}
        </p>

        {results.length > 0 && (
          <ul className="flex w-full flex-col gap-1">
            {results.map((r) => (
              <li key={r.tmdbId}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  disabled={loadingDetail}
                  className="flex w-full items-baseline justify-between gap-4 border-b border-white/5 px-1 py-2 text-left text-sm font-light text-white/70 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white disabled:opacity-40"
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
        placeholder="메모 (선택, 짧게 한 줄이어도 길게 리뷰여도 괜찮아)"
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
