'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { GenreChipPicker } from '@/components/archive/GenreChipPicker'
import { searchTmdbMovies, fetchTmdbMovieDetail, type TmdbSearchResult } from '@/lib/tmdbClient'
import { secondaryNavLinkClass as linkClass } from '@/lib/uiStyles'
import type { Movie } from '@/data/movies'

const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-2 text-sm font-light tracking-widest text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

const WARNING_DURATION = 7000

type Draft = {
  title: string
  year: string
  director: string
  genres: string[]
  posterPath: string | null
}

function emptyDraft(): Draft {
  return { title: '', year: '', director: '', genres: [], posterPath: null }
}

// 로그인하지 않은 방문자도 이 데모 우주에 자기 영화 하나를 "실험 삼아" 넣어볼 수
// 있게 한다. 저장하지 않는다 — 새로고침하면 사라진다. 이 손실을 암묵적으로만
// 두지 않고, 별을 추가한 바로 그 순간에만 한 번 짧게 알려준다(배너 상시 노출이
// 아니라 방금 한 행동에 대한 피드백이라 CLAUDE.md의 절제된 톤과 충돌하지 않는다).
//
// /archive/new(로그인 후 실제 기록)와 같은 TMDB 검색 경험을 그대로 준다 — 수기
// 입력만 되던 예전 버전은 저장 안 되는 실험판이라 대충 만든 것 같은 인상을 줬다.
export function DemoAddStar({ onAdd }: { onAdd: (movie: Movie) => void }) {
  const [stage, setStage] = useState<'closed' | 'search' | 'details' | 'warning'>('closed')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [pending, setPending] = useState(false)
  const [searching, startSearch] = useTransition()
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [loadingDetail, setLoadingDetail] = useState(false)
  const searchTokenRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (stage !== 'warning') return
    const timer = window.setTimeout(() => setStage('closed'), WARNING_DURATION)
    return () => window.clearTimeout(timer)
  }, [stage])

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

  function handleQueryChange(value: string) {
    setQuery(value)
    runSearch(value)
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    runSearch(e.currentTarget.value)
  }

  async function selectResult(result: TmdbSearchResult) {
    if (loadingDetail) return
    setLoadingDetail(true)
    const detail = await fetchTmdbMovieDetail(result.tmdbId).finally(() => setLoadingDetail(false))
    setDraft({
      title: detail?.title ?? result.title,
      year: String(detail?.year ?? result.year ?? ''),
      director: detail?.director ?? '',
      genres: detail?.genres ?? result.genres,
      posterPath: detail?.posterPath ?? result.posterPath,
    })
    setStage('details')
  }

  function startManual() {
    setDraft(emptyDraft())
    setStage('details')
  }

  function openSearch() {
    setQuery('')
    setResults([])
    setDraft(emptyDraft())
    setStage('search')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const y = Number(draft.year)
    if (!draft.title.trim() || !Number.isInteger(y)) return

    onAdd({
      id: `temp-${crypto.randomUUID()}`,
      title: draft.title.trim(),
      year: y,
      director: draft.director.trim(),
      genres: draft.genres,
      themes: [],
      moods: [],
      era: `${Math.floor(y / 10) * 10}s`,
      locations: [],
      posterPath: draft.posterPath ?? undefined,
    })

    setStage('warning')
  }

  return (
    <>
      {stage === 'closed' && (
        <button type="button" onClick={openSearch} className={`absolute bottom-14 right-6 z-10 ${linkClass}`}>
          + 영화 등록해보기
        </button>
      )}

      {/* 검색/직접입력 모달을 document.body로 포탈한다 — 별을 peek(자세히 보기)한
          상태에서 이 버튼을 누르면, peek된 별은 MovieBody.tsx에서 zIndex: 1000을
          받아 여기 z-20보다 훨씬 위에 떠 있어서 이 모달을 완전히 가려버렸다
          (입력창이 안 보이고 클릭도 안 먹히던 버그의 원인). GuidePanel/+ 기록
          모달과 같은 이유로 같은 해법을 쓴다. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {stage === 'search' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE_SLOW }}
                className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95"
              >
            <div className="flex w-full max-w-xs flex-col items-center gap-6">
              <p className="text-center text-[11px] font-light leading-relaxed tracking-widest text-white/30">
                이 포스터는 저장되지 않아.
                <br />
                어떻게 자리 잡는지만 잠깐 볼 수 있어.
              </p>
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onCompositionEnd={handleCompositionEnd}
                placeholder="영화 제목"
                autoFocus
                className={`text-center ${fieldClass}`}
              />

              {/* 결과 목록 바로 위에서 조건부로 마운트/언마운트되면 타이핑 중 계속
                  토글되면서 목록이 밀려 클릭 실수를 유발한다 — 항상 자리를
                  차지하되 보이기만 껐다 켜지게 한다. */}
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

              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => setStage('closed')}
                  className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={startManual}
                  className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
                >
                  직접 입력할게
                </button>
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {stage === 'details' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE_SLOW }}
                className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/95"
              >
            <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-6">
              <p className="text-center text-[11px] font-light leading-relaxed tracking-widest text-white/30">
                이 포스터는 저장되지 않아.
                <br />
                어떻게 자리 잡는지만 잠깐 볼 수 있어.
              </p>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="제목"
                autoFocus
                required
                className={fieldClass}
              />
              <div className="flex w-full gap-4">
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
              <GenreChipPicker selected={draft.genres} onChange={(genres) => setDraft((d) => ({ ...d, genres }))} />
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => setStage('search')}
                  className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
                >
                  뒤로
                </button>
                <button
                  type="submit"
                  className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
                >
                  넣어보기
                </button>
              </div>
            </form>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <AnimatePresence>
        {stage === 'warning' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: EASE_SLOW }}
            className="absolute bottom-14 right-6 z-10"
          >
            {/* 로그인 링크는 따로 안 둔다 — 이 화면엔 이미 우측 하단에 상시
                LOG IN 링크가 있어서(HomeRitual), 여기서 또 띄우면 LOG IN이
                위아래로 두 번 겹쳐 보였다. */}
            <p className="text-[10px] font-light tracking-widest text-white/30">로그인하지 않으면 이 포스터는 사라져.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
