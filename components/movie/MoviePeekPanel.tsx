'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { addViewing, updateLoggedMovie } from '@/lib/loggedMovies'
import { searchTmdbMovies, fetchTmdbMovieDetail, type TmdbSearchResult } from '@/lib/tmdbClient'
import { RatingPicker } from '@/components/archive/RatingPicker'
import { GenreChipPicker } from '@/components/archive/GenreChipPicker'
import { ShareCardButton } from './ShareCardButton'
import { ViewingHistoryStepper } from './ViewingHistoryStepper'
import type { Movie } from '@/data/movies'

const actionClass = 'text-[9px] tracking-[0.25em] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'
const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-1 text-[11px] font-light tracking-wide text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

type Props = {
  movie: Movie
  editable: boolean
  onClose: () => void
  /** core가 아닌 위성에만 있다 — core 자체를 다시 중심으로 만들 수는 없다. */
  onRecenter?: () => void
}

// 별을 클릭해서 "열람"하면 여기가 뜬다. "중심으로 만들기"(탐색, 우주 전체 재배치)와
// 완전히 분리된 액션이다 — 리뷰 하나 읽으려고 우주가 통째로 재배치될 필요는 없다.
// 같은 이유로 감상은 덮어쓰지 않는다: rating/note는 movie.viewings의 최신 항목일
// 뿐이고, "다시 봤어"는 그 위에 새 항목을 쌓는다 — 다시 봤을 때 감상이 달라져도
// 이전 감상이 사라지지 않는다.
export function MoviePeekPanel({ movie, editable, onClose, onRecenter }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [watchedAt, setWatchedAt] = useState(new Date().toISOString().slice(0, 10))

  const [title, setTitle] = useState(movie.title)
  const [year, setYear] = useState(String(movie.year))
  const [director, setDirector] = useState(movie.director)
  const [genres, setGenres] = useState(movie.genres)
  const [pickedTmdb, setPickedTmdb] = useState<{ tmdbId: number; posterPath: string | null } | null>(null)
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([])
  const [searching, startSearch] = useTransition()

  const viewings = movie.viewings ?? []
  const priorViewings = viewings.slice(1)

  async function handleAddViewing(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await addViewing(movie.id, { rating, note: note.trim() || null, watchedAt })
      router.refresh()
      setMode('view')
      setRating(null)
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  function resetMetadataDraft() {
    setTitle(movie.title)
    setYear(String(movie.year))
    setDirector(movie.director)
    setGenres(movie.genres)
    setPickedTmdb(null)
    setTmdbResults([])
  }

  // 제목 입력창 자체가 검색창이다 — 타이핑하면 TMDB에서 후보를 찾아 보여주고,
  // 고르면 연도/감독/장르/포스터까지 같이 채워진다. 안 골라도(수기로 오타만
  // 고치는 경우) 그냥 지금 값 그대로 저장되니 검색이 강제되지 않는다.
  function handleTitleChange(value: string) {
    setTitle(value)
    setPickedTmdb(null)
    if (value.trim().length < 1) {
      setTmdbResults([])
      return
    }
    startSearch(async () => {
      const found = await searchTmdbMovies(value.trim())
      setTmdbResults(found)
    })
  }

  async function applyTmdbResult(result: TmdbSearchResult) {
    const detail = await fetchTmdbMovieDetail(result.tmdbId)
    setTitle(detail?.title ?? result.title)
    setYear(String(detail?.year ?? result.year ?? ''))
    setDirector(detail?.director ?? '')
    setGenres(detail?.genres ?? result.genres)
    setPickedTmdb({ tmdbId: result.tmdbId, posterPath: detail?.posterPath ?? result.posterPath })
    setTmdbResults([])
  }

  async function handleEditMetadata(e: FormEvent) {
    e.preventDefault()
    const y = Number(year)
    if (!title.trim() || !Number.isInteger(y)) return
    setSaving(true)
    try {
      await updateLoggedMovie(movie.id, {
        title: title.trim(),
        year: y,
        director: director.trim() || null,
        genres,
        ...(pickedTmdb ? { tmdbId: pickedTmdb.tmdbId, posterPath: pickedTmdb.posterPath } : {}),
      })
      router.refresh()
      setMode('view')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-star="" className="pointer-events-auto flex w-56 flex-col items-center gap-2 bg-black px-3 py-3">
      {mode === 'view' && (
        <>
          {/* 메모는 여기서 일부러 안 자른다 — peek는 "전체를 보러" 클릭한
              상태니까. 대신 메모가 아주 길어지면 패널 자체가 뷰포트보다 커져서
              "닫기" 버튼조차 화면 밖으로 밀려날 수 있다(스크롤 없는 화면이라
              도달 불가). 그래서 이 내용 영역만 최대 높이 + 내부 스크롤을 주고,
              액션 버튼 줄은 이 스크롤 밖에 둬서 항상 화면에 남게 한다. */}
          <div className="peek-scroll flex max-h-[32vh] w-full flex-col items-center gap-2 overflow-y-auto">
            {movie.posterPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                alt=""
                loading="lazy"
                className="h-24 w-16 shrink-0 object-cover opacity-70 saturate-[0.65] brightness-[0.82]"
              />
            )}

            {movie.rating != null && (
              <div className="text-[10px] tracking-[0.2em] text-white/50">
                {'★'.repeat(movie.rating)}
                {'☆'.repeat(5 - movie.rating)}
              </div>
            )}

            {movie.genres.length > 0 && (
              <div className="whitespace-nowrap text-[9px] tracking-[0.1em] text-white/35">{movie.genres.join(' · ')}</div>
            )}

            {movie.note && (
              <div className="max-w-full text-center text-[9px] leading-relaxed tracking-wide text-white/40">{movie.note}</div>
            )}

            {viewings[0] && <div className="text-[8px] tracking-[0.2em] text-white/25">{viewings[0].watchedAt}</div>}

            {priorViewings.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className={actionClass}>
                {expanded ? '접기' : `이전 감상 ${priorViewings.length}개`}
              </button>
            )}

            {expanded && (
              <div className="w-full border-t border-white/10 pt-2">
                <ViewingHistoryStepper viewings={priorViewings} />
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {onRecenter && (
              <button type="button" onClick={onRecenter} className={actionClass}>
                이 영화를 중심으로
              </button>
            )}
            {editable && (
              <button type="button" onClick={() => setMode('add')} className={actionClass}>
                다시 봤어
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={() => {
                  resetMetadataDraft()
                  setMode('edit')
                }}
                className={actionClass}
              >
                정보 수정
              </button>
            )}
            {editable && <ShareCardButton loggedMovieId={movie.id} />}
            <button type="button" onClick={onClose} className="text-[9px] tracking-[0.25em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60">
              닫기
            </button>
          </div>
        </>
      )}

      {mode === 'add' && (
        <form onSubmit={handleAddViewing} className="flex w-full flex-col items-center gap-3">
          <RatingPicker value={rating} onChange={setRating} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="한줄메모 (선택)"
            rows={2}
            className={`resize-none ${fieldClass}`}
          />
          <input
            type="date"
            value={watchedAt}
            onChange={(e) => setWatchedAt(e.target.value)}
            className="border-b border-white/15 bg-transparent px-1 py-1 text-[10px] text-white/50 outline-none [color-scheme:dark] focus:border-white/40"
          />
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMode('view')} className="text-[9px] tracking-[0.25em] text-white/30 outline-none transition-colors duration-500 hover:text-white/60">
              취소
            </button>
            <button type="submit" disabled={saving} className={`${actionClass} disabled:text-white/20`}>
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      )}

      {mode === 'edit' && (
        <form onSubmit={handleEditMetadata} className="flex w-full flex-col items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="제목"
            required
            className={fieldClass}
          />
          {searching && <p className="text-[9px] tracking-widest text-white/25">검색 중</p>}
          {tmdbResults.length > 0 && (
            <ul className="flex w-full flex-col gap-1">
              {tmdbResults.map((r) => (
                <li key={r.tmdbId}>
                  <button
                    type="button"
                    onClick={() => applyTmdbResult(r)}
                    className="flex w-full items-baseline justify-between gap-2 border-b border-white/5 px-1 py-1 text-left text-[10px] font-light text-white/70 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white"
                  >
                    <span className="tracking-wide">{r.title}</span>
                    <span className="shrink-0 text-[9px] text-white/30">{r.year ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pickedTmdb && <p className="text-[8px] tracking-widest text-white/25">TMDB에서 불러옴</p>}

          <div className="flex w-full gap-2">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="연도"
              required
              className={`w-1/2 ${fieldClass}`}
            />
            <input
              type="text"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              placeholder="감독"
              className={`w-1/2 ${fieldClass}`}
            />
          </div>
          <GenreChipPicker selected={genres} onChange={setGenres} />
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMode('view')} className="text-[9px] tracking-[0.25em] text-white/30 outline-none transition-colors duration-500 hover:text-white/60">
              취소
            </button>
            <button type="submit" disabled={saving} className={`${actionClass} disabled:text-white/20`}>
              {saving ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
