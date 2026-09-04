'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { addViewing, deleteViewing, updateLoggedMovie, updateViewing } from '@/lib/loggedMovies'
import { searchTmdbMovies, fetchTmdbMovieDetail, type TmdbSearchResult } from '@/lib/tmdbClient'
import { editorialReason } from '@/lib/gravity'
import { EASE_SLOW } from '@/lib/motion'
import { RatingPicker } from '@/components/archive/RatingPicker'
import { GenreChipPicker } from '@/components/archive/GenreChipPicker'
import { PencilIcon } from '@/components/icons/PencilIcon'
import { ShareCardButton } from './ShareCardButton'
import { ViewingHistoryStepper } from './ViewingHistoryStepper'
import type { Movie, MovieViewing } from '@/data/movies'

// 앞면(포스터 카드, 객관적 정보) ↔ 뒷면(내 평점/메모/액션)을 오가는 회전 애니메이션.
// 두 면의 실제 콘텐츠 높이가 서로 달라서(포스터 카드는 세로로 길고, 뒷면은
// 액션이 많다) 두 면을 겹쳐 쌓아두는 진짜 3D 카드보다, AnimatePresence로 한
// 면씩 마운트/언마운트하면서 그 사이만 회전하는 쪽이 레이아웃이 안 깨지지 않는다.
const FLIP_TRANSITION = { duration: 0.9, ease: EASE_SLOW }

// 처음 이 컨트롤을 마주쳤을 때 딱 한 번, 뭘 하는 건지 아주 작게 알려준다 —
// 두 번째부터는 다시 안 뜬다(로컬스토리지로 기억). "중심 옮기기"/"다시 보기"가
// 뭘 위한 기능인지 몰라서 안 눌러봤다는 피드백이 있었다.
const RECENTER_HINT_KEY = 'cinelog:hint-seen:recenter'
const REWATCH_HINT_KEY = 'cinelog:hint-seen:rewatch'

const actionClass = 'text-[9px] tracking-[0.25em] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'
const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-1 text-[11px] font-light tracking-wide text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

type Props = {
  movie: Movie
  /** 현재 중심 영화. movie와의 editorial 큐레이터 노트를 찾는 데 쓴다. */
  center: Movie
  editable: boolean
  /** 있으면 평점/메모(감상)가 Supabase 대신 이 함수로 로컬 상태에만 반영된다
   * (데모 우주의 게스트 체험용) — editable과 별개다. "정보 수정"/카드 공유는
   * 여전히 editable에만 반응한다(큐레이션 자체를 고치는 건 다른 기능이라서). */
  onGuestMutate?: (movieId: string, mutate: (movie: Movie) => Movie) => void
  /** tmdbId → 이미 기록한 그 영화의 logged_movie id. "정보 수정"에서 다른 이미
   * 기록한 영화와 같은 작품으로 검색 결과를 고르면, 저장 버튼을 누르기 전에
   * 미리 막는 데 쓴다(저장 시점에도 DB 유니크 제약이 한 번 더 막아준다). */
  existingByTmdbId?: Record<number, string>
  /** 이미 만들어진 영화 카드 공유 URL(서버에서 미리 조회) — ShareCardButton으로 그대로 전달된다. */
  initialCardUrl?: string | null
  /** true면 뒷면(내 평점/메모/액션)을, false면 앞면(포스터 카드)을 보여준다. */
  showBack: boolean
  /** 앞뒤를 뒤집는다 — 별을 다시 클릭하거나, 앞면 카드/뒷면의 "포스터" 링크를 눌러도 호출된다. */
  onFlip: () => void
  onClose: () => void
  /** core가 아닌 위성에만 있다 — core 자체를 다시 중심으로 만들 수는 없다. */
  onRecenter?: () => void
}

// 별을 클릭해서 "열람"하면 여기가 뜬다. "중심으로 만들기"(탐색, 우주 전체 재배치)와
// 완전히 분리된 액션이다 — 리뷰 하나 읽으려고 우주가 통째로 재배치될 필요는 없다.
// 같은 이유로 감상은 덮어쓰지 않는다: rating/note는 movie.viewings의 최신 항목일
// 뿐이고, "다시 봤어"는 그 위에 새 항목을 쌓는다 — 다시 봤을 때 감상이 달라져도
// 이전 감상이 사라지지 않는다.
export function MoviePeekPanel({
  movie,
  center,
  editable,
  onGuestMutate,
  existingByTmdbId,
  initialCardUrl,
  showBack,
  onFlip,
  onClose,
  onRecenter,
}: Props) {
  const router = useRouter()
  // 감상(평점/메모) 관련 UI는 editable(실제 계정)이거나 onGuestMutate(데모 게스트
  // 체험)이 있으면 켠다 — "정보 수정"/카드 공유는 아래에서 별도로 editable만 본다.
  const guestEnabled = editable || !!onGuestMutate
  // 동작 줄이기를 켠 사용자에게는 3D 회전 대신 밝기만 바뀌는 크로스페이드로
  // 뒤집는다 — 회전은 3D 공간에서 물체가 도는 것처럼 보여서 어지러움을 유발하기
  // 쉬운 종류의 움직임이다.
  const reducedMotion = useReducedMotion()
  const rotate = (deg: number) => (reducedMotion ? {} : { rotateY: deg })
  const [mode, setMode] = useState<'view' | 'add' | 'edit' | 'edit-viewing'>('view')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [editingViewingId, setEditingViewingId] = useState<string | null>(null)
  const [showRecenterHint, setShowRecenterHint] = useState(false)
  const [showRewatchHint, setShowRewatchHint] = useState(false)
  // TMDB 포스터 경로는 있는데 실제 이미지 로드가 실패하면(포스터가 내려갔거나
  // 네트워크 오류) 브라우저 기본 "깨진 이미지" 아이콘이 뜨는데, 이 톤과 완전히
  // 안 어울린다 — 실패하면 그냥 "포스터 없음" 플레이스홀더로 대체한다.
  const [posterFailed, setPosterFailed] = useState(false)

  useEffect(() => {
    try {
      if (onRecenter && !localStorage.getItem(RECENTER_HINT_KEY)) {
        // 로컬스토리지(외부 시스템) 값을 마운트 시점에 한 번만 React 상태로
        // 반영한다 — HomeRitual의 세션스토리지 체크와 같은 패턴.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowRecenterHint(true)
        localStorage.setItem(RECENTER_HINT_KEY, '1')
      }
      if (guestEnabled && !localStorage.getItem(REWATCH_HINT_KEY)) {
        setShowRewatchHint(true)
        localStorage.setItem(REWATCH_HINT_KEY, '1')
      }
    } catch {
      // 로컬스토리지를 못 쓰는 환경에서는 그냥 매번 힌트를 안 보여준다 — 기능엔 영향 없다.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reason = movie.id !== center.id ? editorialReason(center, movie) : undefined

  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [watchedAt, setWatchedAt] = useState(new Date().toISOString().slice(0, 10))

  const [title, setTitle] = useState(movie.title)
  const [year, setYear] = useState(String(movie.year))
  const [director, setDirector] = useState(movie.director)
  const [genres, setGenres] = useState(movie.genres)
  const [pickedTmdb, setPickedTmdb] = useState<{ tmdbId: number; posterPath: string | null } | null>(null)
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([])
  const [tmdbPending, setTmdbPending] = useState(false)
  const [tmdbLoadingDetail, setTmdbLoadingDetail] = useState(false)
  const [searching, startSearch] = useTransition()
  const tmdbSearchTokenRef = useRef(0)
  const tmdbDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const viewings = movie.viewings ?? []
  const priorViewings = viewings.slice(1)

  async function handleAddViewing(e: FormEvent) {
    e.preventDefault()

    if (onGuestMutate) {
      onGuestMutate(movie.id, (m) => {
        const newViewing: MovieViewing = {
          id: `guest-${crypto.randomUUID()}`,
          rating: rating ?? undefined,
          note: note.trim() || undefined,
          watchedAt,
        }
        const nextViewings = [newViewing, ...(m.viewings ?? [])]
        return { ...m, viewings: nextViewings, rating: newViewing.rating, note: newViewing.note }
      })
      setMode('view')
      setRating(null)
      setNote('')
      return
    }

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

  // 잘못 입력한 평점/메모/날짜를 고칠 수 있어야 한다는 피드백으로 추가했다.
  // 지금은 가장 최근 감상만 고칠 수 있다 — 히스토리를 넘겨보는 과거 감상까지
  // 편집하려면 ViewingHistoryStepper에도 편집 진입점이 필요한데, 우선 가장 많이
  // 쓰일 "방금 남긴 감상 고치기"부터 지원한다.
  function startEditLatestViewing() {
    const latest = viewings[0]
    if (!latest) return
    setEditingViewingId(latest.id)
    setRating(latest.rating ?? null)
    setNote(latest.note ?? '')
    setWatchedAt(latest.watchedAt)
    setMode('edit-viewing')
  }

  async function handleUpdateViewing(e: FormEvent) {
    e.preventDefault()
    if (!editingViewingId) return

    if (onGuestMutate) {
      onGuestMutate(movie.id, (m) => {
        const list = m.viewings ?? []
        const idx = list.findIndex((v) => v.id === editingViewingId)
        if (idx === -1) return m
        const nextViewings = [...list]
        nextViewings[idx] = { ...nextViewings[idx], rating: rating ?? undefined, note: note.trim() || undefined, watchedAt }
        const latest = nextViewings[0]
        return { ...m, viewings: nextViewings, rating: latest.rating, note: latest.note }
      })
      setMode('view')
      return
    }

    setSaving(true)
    try {
      await updateViewing(editingViewingId, { rating, note: note.trim() || null, watchedAt })
      router.refresh()
      setMode('view')
    } finally {
      setSaving(false)
    }
  }

  // 그 영화의 마지막 남은 감상은 지우지 않는다 — combineLoggedMovie가 항상 최소
  // 1개의 viewing을 전제하기 때문에, 다 지우면 그 영화 자체가 표시할 수 없는
  // 상태가 된다(이럴 땐 "정보 수정"이 아니라 영화 자체를 지우는 기능이 필요한데
  // 아직 없다 — 요청받으면 추가).
  async function handleDeleteLatestViewing() {
    const latest = viewings[0]
    if (!latest || viewings.length <= 1) return

    if (onGuestMutate) {
      onGuestMutate(movie.id, (m) => {
        const nextViewings = (m.viewings ?? []).slice(1)
        const newLatest = nextViewings[0]
        return { ...m, viewings: nextViewings, rating: newLatest?.rating, note: newLatest?.note }
      })
      return
    }

    setSaving(true)
    try {
      await deleteViewing(latest.id)
      router.refresh()
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
    setEditError(null)
    setDuplicateTargetId(null)
  }

  // 제목 입력창 자체가 검색창이다 — 타이핑하면 TMDB에서 후보를 찾아 보여주고,
  // 고르면 연도/감독/장르/포스터까지 같이 채워진다. 안 골라도(수기로 오타만
  // 고치는 경우) 그냥 지금 값 그대로 저장되니 검색이 강제되지 않는다.
  function handleTitleChange(value: string) {
    setTitle(value)
    setPickedTmdb(null)
    setEditError(null)
    setDuplicateTargetId(null)
    if (tmdbDebounceRef.current) clearTimeout(tmdbDebounceRef.current)
    if (value.trim().length < 1) {
      setTmdbPending(false)
      setTmdbResults([])
      return
    }
    setTmdbPending(true)
    tmdbDebounceRef.current = setTimeout(() => {
      const token = ++tmdbSearchTokenRef.current
      startSearch(async () => {
        const found = await searchTmdbMovies(value.trim())
        if (token === tmdbSearchTokenRef.current) {
          setTmdbResults(found)
          setTmdbPending(false)
        }
      })
    }, 300)
  }

  async function applyTmdbResult(result: TmdbSearchResult) {
    const existingId = existingByTmdbId?.[result.tmdbId]
    if (existingId && existingId !== movie.id) {
      setEditError('이미 기록한 다른 영화와 같은 작품이야.')
      setDuplicateTargetId(existingId)
      setTmdbResults([])
      return
    }
    setEditError(null)
    setDuplicateTargetId(null)

    if (tmdbLoadingDetail) return
    setTmdbLoadingDetail(true)
    const detail = await fetchTmdbMovieDetail(result.tmdbId).finally(() => setTmdbLoadingDetail(false))
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
    setEditError(null)
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
    } catch (err) {
      // 23505 = unique_violation — 이 tmdb_id로 이미 기록한 다른 영화가 있다는
      // 뜻이다(logged_movies_user_tmdb_unique). 그 외엔 일반 저장 실패 메시지.
      const isDuplicate = (err as { code?: string } | null)?.code === '23505'
      setEditError(isDuplicate ? '이미 기록한 다른 영화와 같은 작품이야.' : '저장하지 못했어. 잠시 후 다시 시도해줘.')
      setDuplicateTargetId(isDuplicate ? (pickedTmdb ? existingByTmdbId?.[pickedTmdb.tmdbId] ?? null : null) : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    // layoutId를 MovieBody의 작은 포스터 별과 공유한다 — 별이 사라지고 이 패널이
    // 뜨는 순간, 프레이머모션이 둘의 위치/크기를 자동으로 보간해서 "그 자리에서
    // 포스터가 커져 카드가 되는" 것처럼 보이게 한다(카메라는 안 움직인다).
    <motion.div
      layoutId={`star-${movie.id}`}
      layout="size"
      data-star=""
      transition={{ layout: { duration: 0.5, ease: EASE_SLOW } }}
      // 높이를 고정하면 내용 적은 면(주로 뒷면)이 텅 빈 박스처럼 보인다 — 그래서
      // 내용에 맞게 자연스럽게 늘었다 줄었다 하는 쪽으로 되돌렸다. layout="size"는
      // 가로/세로 "위치"는 건드리지 않고 "크기"만 애니메이션해서, rotateY 회전과
      // 부딪혀 옆으로 미끄러지던 문제를 피한다.
      className="themed-scroll pointer-events-auto flex max-h-[85vh] w-[min(88vw,340px)] flex-col items-center gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black px-4 py-4"
    >
      {mode === 'view' && (
        <AnimatePresence mode="wait" initial={false}>
          {showBack ? (
            <motion.div
              key="back"
              initial={{ ...rotate(-90), opacity: 0 }}
              animate={{ ...rotate(0), opacity: 1 }}
              exit={{ ...rotate(90), opacity: 0 }}
              transition={FLIP_TRANSITION}
              style={{ transformPerspective: 900 }}
              className="flex w-full flex-col items-center gap-2"
              // 버튼/텍스트가 아닌 여백을 클릭해도 앞면(포스터)으로 뒤집힌다 —
              // "← 포스터"까지 일부러 찾아 누를 필요는 없게. e.target이 이
              // 컨테이너 자신일 때만(=자식 버튼/텍스트 위가 아닐 때만) 반응하므로
              // 버튼 클릭이 이중으로 뒤집는 일은 없다.
              onClick={(e) => {
                if (e.target === e.currentTarget) onFlip()
              }}
            >
              <button
                type="button"
                onClick={onFlip}
                className="self-start text-[8px] tracking-[0.2em] text-white/20 outline-none transition-colors duration-500 hover:text-white/50"
              >
                ← 포스터
              </button>

              {/* 메모는 여기서 일부러 안 자른다 — peek는 "전체를 보러" 클릭한
                  상태니까. 대신 메모가 아주 길어지면 패널 자체가 뷰포트보다 커져서
                  "닫기" 버튼조차 화면 밖으로 밀려날 수 있다(스크롤 없는 화면이라
                  도달 불가). 그래서 이 내용 영역만 최대 높이 + 내부 스크롤을 주고,
                  액션 버튼 줄은 이 스크롤 밖에 둬서 항상 화면에 남게 한다. */}
              <div
                className="themed-scroll flex max-h-[32vh] w-full flex-col items-center gap-2 overflow-y-auto"
                onClick={(e) => {
                  if (e.target === e.currentTarget) onFlip()
                }}
              >
                {(movie.rating != null || (guestEnabled && viewings[0])) && (
                  <div className="flex items-center gap-2">
                    {movie.rating != null && (
                      <div className="text-[10px] tracking-[0.2em] text-white/50">
                        {'★'.repeat(movie.rating)}
                        {'☆'.repeat(5 - movie.rating)}
                      </div>
                    )}
                    {guestEnabled && viewings[0] && (
                      <button
                        type="button"
                        onClick={startEditLatestViewing}
                        aria-label="이 감상 고치기"
                        title="이 감상 고치기"
                        className="-m-2 flex items-center justify-center p-2 text-white/35 outline-none transition-colors duration-500 hover:text-white/70"
                      >
                        <PencilIcon />
                      </button>
                    )}
                  </div>
                )}

                {movie.note && (
                  // 왼쪽 정렬로 뒀다 — 한 줄짜리 메모는 가운데 정렬이 괜찮지만, 여러
                  // 문단짜리 리뷰는 가운데 정렬이면 읽기 어렵다.
                  <div className="w-full max-w-full whitespace-pre-line text-left text-[9px] leading-relaxed tracking-wide text-white/40">
                    {movie.note}
                  </div>
                )}

                {reason && (
                  <div className="max-w-full text-center text-[9px] italic leading-relaxed tracking-wide text-white/35">
                    “{reason}”
                  </div>
                )}

                {viewings[0] && (
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] tracking-[0.2em] text-white/25">{viewings[0].watchedAt}</span>
                    {guestEnabled && viewings.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDeleteLatestViewing}
                        className="text-[8px] tracking-[0.2em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}

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

              <div
                className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5"
                onClick={(e) => {
                  if (e.target === e.currentTarget) onFlip()
                }}
              >
                {guestEnabled && (
                  <button type="button" onClick={() => setMode('add')} className={actionClass}>
                    {viewings.length > 0 ? '다시 본 감상 남기기' : '감상 남기기'}
                  </button>
                )}
                <button type="button" onClick={onClose} className="text-[9px] tracking-[0.25em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60">
                  닫기
                </button>
              </div>

              {showRewatchHint && (
                <div className="flex flex-col items-center gap-1 px-2">
                  <p className="text-center text-[8px] leading-relaxed tracking-wide text-white/25">
                    같은 영화를 또 봤다면 새 감상을 남겨. 이전 감상은 지워지지 않고 쌓여
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="front"
              initial={{ ...rotate(90), opacity: 0 }}
              animate={{ ...rotate(0), opacity: 1 }}
              exit={{ ...rotate(-90), opacity: 0 }}
              transition={FLIP_TRANSITION}
              style={{ transformPerspective: 900 }}
              className="flex w-full cursor-pointer flex-col items-center gap-2"
              onClick={onFlip}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                // 앞면 카드 전체가 클릭 대상이지만 <div>라서(안에 진짜 <button>인
                // 연필/공유 아이콘이 있어 이 카드 자체를 <button>으로 바꿀 수는
                // 없다) 키보드 포커스를 받아도 엔터/스페이스로는 반응하지
                // 않았다 — 직접 처리해서 별을 다시 찾지 않아도 뒤집을 수 있게 한다.
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onFlip()
                }
              }}
            >
              <div className="relative flex w-full justify-center">
                {movie.posterPath && !posterFailed ? (
                  <>
                    {/* 유튜브 앰비언트 모드처럼, 포스터 자체를 크게 확대해 블러한
                        사본을 뒤에 깔아서 그 영화의 색이 은은하게 새어나오게
                        한다 — 픽셀을 읽어 "대표색" 하나를 뽑는 대신(포스터가
                        외부 CDN이라 캔버스로 읽으면 CORS에 막힐 수 있다) CSS
                        블러만으로 같은 효과를 낸다. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="pointer-events-none absolute -inset-6 -z-10 object-cover opacity-35 blur-3xl"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                      alt=""
                      loading="lazy"
                      onError={() => setPosterFailed(true)}
                      className="relative aspect-[2/3] w-full max-w-[260px] rounded-sm object-cover opacity-90 saturate-[0.8] brightness-[0.9]"
                    />
                  </>
                ) : (
                  <div className="flex aspect-[2/3] w-full max-w-[260px] items-center justify-center rounded-sm border border-white/10">
                    <span className="text-[9px] tracking-[0.2em] text-white/20">포스터 없음</span>
                  </div>
                )}

                {/* "정보 수정"/"카드 공유"를 뒷면 텍스트 버튼 대신 포스터 구석의
                    아이콘으로 옮겼다 — 카드를 눌렀을 때(뒤집기)와 겹치지 않도록
                    각 아이콘 클릭에서 이벤트 전파를 막는다. */}
                {editable && (
                  <div className="absolute right-1 top-1 flex gap-3 bg-black/50 px-1.5 py-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        resetMetadataDraft()
                        setMode('edit')
                      }}
                      aria-label="정보 수정"
                      title="정보 수정"
                      className="-m-1.5 flex items-center justify-center p-1.5 text-white/50 outline-none transition-colors duration-500 hover:text-white/85"
                    >
                      <PencilIcon />
                    </button>
                    <ShareCardButton
                      loggedMovieId={movie.id}
                      initialUrl={initialCardUrl}
                      variant="icon"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>

              <div className="mt-1 flex flex-col items-center gap-1 px-2 text-center">
                <p className="text-[11px] tracking-[0.1em] text-white/80">
                  {movie.title} <span className="text-white/40">{movie.year}</span>
                </p>
                {movie.director && <p className="text-[9px] tracking-[0.15em] text-white/40">{movie.director}</p>}
                {movie.genres.length > 0 && (
                  <p className="text-[9px] tracking-[0.1em] text-white/30">{movie.genres.join(' · ')}</p>
                )}
              </div>

              {/* "이 영화를 중심으로"는 내 감상이 아니라 우주를 탐색하는 액션이라
                  뒷면(내 평점/메모)보다 앞면(객관적 정보)에 더 자연스럽다 —
                  감상을 안 남긴 영화라도 뒤집을 필요 없이 바로 다른 세계로
                  넘어갈 수 있게 된다. 카드 전체가 클릭(뒤집기) 영역이라 전파를 막는다. */}
              {onRecenter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRecenter()
                  }}
                  className={actionClass}
                >
                  이 영화를 중심으로
                </button>
              )}
              {showRecenterHint && (
                <p className="max-w-[220px] text-center text-[8px] leading-relaxed tracking-wide text-white/25">
                  중심을 옮기면 우주 전체가 이 영화와의 관계로 다시 배치돼
                </p>
              )}

              <p className="mt-1 text-[8px] tracking-[0.2em] text-white/20">눌러서 뒤집기</p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {mode === 'add' && (
        <form onSubmit={handleAddViewing} className="flex w-full flex-col items-center gap-3">
          <RatingPicker value={rating} onChange={setRating} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택, 짧게 한 줄이어도 길게 리뷰여도 괜찮아)"
            rows={3}
            className={`max-h-[40vh] resize-y ${fieldClass}`}
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

      {mode === 'edit-viewing' && (
        <form onSubmit={handleUpdateViewing} className="flex w-full flex-col items-center gap-3">
          <RatingPicker value={rating} onChange={setRating} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택, 짧게 한 줄이어도 길게 리뷰여도 괜찮아)"
            rows={3}
            className={`max-h-[40vh] resize-y ${fieldClass}`}
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
          {/* 결과 목록 바로 위에서 조건부로 마운트/언마운트되면 타이핑 중 계속
              토글되면서 목록이 밀려 클릭 실수를 유발한다 — 항상 자리를
              차지하되 보이기만 껐다 켜지게 한다. */}
          <p
            className={`text-[9px] tracking-widest text-white/25 ${
              tmdbPending || searching || tmdbLoadingDetail ? '' : 'invisible'
            }`}
          >
            {tmdbLoadingDetail ? '불러오는 중' : '검색 중'}
          </p>
          {tmdbResults.length > 0 && (
            <ul className="flex w-full flex-col gap-1">
              {tmdbResults.map((r) => (
                <li key={r.tmdbId}>
                  <button
                    type="button"
                    onClick={() => applyTmdbResult(r)}
                    disabled={tmdbLoadingDetail}
                    className="flex w-full items-baseline justify-between gap-2 border-b border-white/5 px-1 py-1 text-left text-[10px] font-light text-white/70 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white disabled:opacity-40"
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
          {editError && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-[9px] tracking-widest text-white/40">{editError}</p>
              {duplicateTargetId && (
                <Link
                  href={`/archive?focus=${duplicateTargetId}`}
                  className="text-[9px] tracking-[0.25em] text-white/40 outline-none transition-colors duration-500 hover:text-white/70"
                >
                  그 별로 가기
                </Link>
              )}
            </div>
          )}
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
    </motion.div>
  )
}
