'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addViewing, deleteViewing, updateLoggedMovie, updateViewing } from '@/lib/loggedMovies'
import { searchTmdbMovies, fetchTmdbMovieDetail, type TmdbSearchResult } from '@/lib/tmdbClient'
import { editorialReason } from '@/lib/gravity'
import { RatingPicker } from '@/components/archive/RatingPicker'
import { GenreChipPicker } from '@/components/archive/GenreChipPicker'
import { PencilIcon } from '@/components/icons/PencilIcon'
import { ShareCardButton } from './ShareCardButton'
import { ViewingHistoryTimeline } from './ViewingHistoryTimeline'
import type { Movie, MovieViewing } from '@/data/movies'
import { useLocale } from '@/components/i18n/LocaleProvider'

// 처음 이 컨트롤을 마주쳤을 때 딱 한 번, 뭘 하는 건지 아주 작게 알려준다 —
// 두 번째부터는 다시 안 뜬다(로컬스토리지로 기억). "다시 보기"가 뭘 위한
// 기능인지 몰라서 안 눌러봤다는 피드백이 있었다.
const REWATCH_HINT_KEY = 'cinelog:hint-seen:rewatch'

const actionClass = 'text-[9px] tracking-[var(--tk-25)] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'
const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-1 text-[11px] font-light tracking-wide text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

type Props = {
  movie: Movie
  /** 이 영화와 가장 강하게 연결된 다른 영화(있으면) — 그 둘 사이의 editorial
   * 큐레이터 노트를 찾는 데 쓴다. 관계가 하나도 없으면 undefined. */
  closestMovie?: Movie
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
  /** MovieBody가 화면상 남은 공간을 실측해 계산한 최대 높이(px) — 없으면 70vh로
   * 대체한다(서버 렌더 등 window를 못 쓰는 순간을 위한 안전값일 뿐, 평소엔
   * 항상 값이 온다). */
  maxHeightPx?: number | null
  onClose: () => void
}

// 별을 클릭해서 "열람"하면 그 별 옆에 이 패널이 인라인으로 나타난다(카메라가
// 그 별로 확대해서 다가간 뒤). 포스터/제목/장르 같은 객관적 정보는 이미 별
// 자신이 항상 보여주므로(MovieBody), 여기서는 "내 감상"에 해당하는 것만
// 다룬다 — 평점/메모/다시보기 이력, 큐레이터 노트.
//
// (2026-09-06) "이 영화를 중심으로"(우주 전체 재배치) 액션을 없앴다 — 사용자가
// 직접 써보면서 그 조작을 자연스럽게 찾은 적이 없다는 피드백. 이제 열람(클릭)
// 자체가 MovieUniverse에서 "관련 영화 강조"를 함께 켜므로, 재배치 없이도
// 관계를 보여주는 목적은 그대로 달성된다.
export function MoviePeekPanel({
  movie,
  closestMovie,
  editable,
  onGuestMutate,
  existingByTmdbId,
  initialCardUrl,
  maxHeightPx,
  onClose,
}: Props) {
  const { t } = useLocale()
  const router = useRouter()
  // 감상(평점/메모) 관련 UI는 editable(실제 계정)이거나 onGuestMutate(데모 게스트
  // 체험)이 있으면 켠다 — "정보 수정"/카드 공유는 아래에서 별도로 editable만 본다.
  const guestEnabled = editable || !!onGuestMutate
  const [mode, setMode] = useState<'view' | 'add' | 'edit' | 'edit-viewing'>('view')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null)
  const [editingViewingId, setEditingViewingId] = useState<string | null>(null)
  const [showRewatchHint, setShowRewatchHint] = useState(false)

  useEffect(() => {
    try {
      if (guestEnabled && !localStorage.getItem(REWATCH_HINT_KEY)) {
        // 로컬스토리지(외부 시스템) 값을 마운트 시점에 한 번만 React 상태로
        // 반영한다 — HomeRitual의 세션스토리지 체크와 같은 패턴.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowRewatchHint(true)
        localStorage.setItem(REWATCH_HINT_KEY, '1')
      }
    } catch {
      // 로컬스토리지를 못 쓰는 환경에서는 그냥 매번 힌트를 안 보여준다 — 기능엔 영향 없다.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reason = closestMovie ? editorialReason(closestMovie, movie) : undefined

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
  // 편집하려면 ViewingHistoryTimeline에도 편집 진입점이 필요한데, 우선 가장 많이
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
      setEditError(t('peek.duplicateError'))
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
      setEditError(isDuplicate ? t('peek.duplicateError') : t('error.saveFailed'))
      setDuplicateTargetId(isDuplicate ? (pickedTmdb ? existingByTmdbId?.[pickedTmdb.tmdbId] ?? null : null) : null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      data-star=""
      className="themed-scroll pointer-events-auto flex w-[min(80vw,300px)] flex-col items-center gap-3 overflow-y-auto rounded-lg border border-white/10 bg-black/90 px-4 py-4 backdrop-blur-sm"
      style={{ maxHeight: maxHeightPx ? `${maxHeightPx}px` : '70vh' }}
    >
      {mode === 'view' && (
        <div className="flex w-full flex-col items-center gap-3">
          {editable && (
            <div className="flex items-center gap-3 self-end">
              <button
                type="button"
                onClick={() => {
                  resetMetadataDraft()
                  setMode('edit')
                }}
                aria-label={t('nav.editInfo')}
                title={t('nav.editInfo')}
                className="-m-1.5 flex items-center justify-center p-1.5 text-white/50 outline-none transition-colors duration-500 hover:text-white/85"
              >
                <PencilIcon />
              </button>
              <ShareCardButton loggedMovieId={movie.id} initialUrl={initialCardUrl} variant="icon" />
            </div>
          )}

          <div className="themed-scroll flex max-h-[38vh] w-full flex-col items-center gap-3 overflow-y-auto">
            {viewings[0] && (
              <ViewingHistoryTimeline
                viewings={viewings}
                guestEnabled={guestEnabled}
                onEditLatest={startEditLatestViewing}
                onDeleteLatest={handleDeleteLatestViewing}
              />
            )}

            {reason && (
              <div className="max-w-full text-center text-[9px] italic leading-relaxed tracking-wide text-white/35">
                “{reason}”
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {guestEnabled && (
              <button type="button" onClick={() => setMode('add')} className={actionClass}>
                {viewings.length > 0 ? t('peek.logAnotherViewing') : t('peek.logViewing')}
              </button>
            )}
            <button type="button" onClick={onClose} className="text-[9px] tracking-[var(--tk-25)] text-white/25 outline-none transition-colors duration-500 hover:text-white/60">
              {t('nav.close')}
            </button>
          </div>

          {showRewatchHint && (
            <p className="max-w-[220px] text-center text-[8px] leading-relaxed tracking-wide text-white/25">
              {t('peek.rewatchHint')}
            </p>
          )}
        </div>
      )}

      {mode === 'add' && (
        <form onSubmit={handleAddViewing} className="flex w-full flex-col items-center gap-3">
          <RatingPicker value={rating} onChange={setRating} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('form.notePlaceholder')}
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
            <button type="button" onClick={() => setMode('view')} className="text-[9px] tracking-[var(--tk-25)] text-white/30 outline-none transition-colors duration-500 hover:text-white/60">
              {t('peek.cancel')}
            </button>
            <button type="submit" disabled={saving} className={`${actionClass} disabled:text-white/20`}>
              {saving ? t('peek.saving') : t('peek.save')}
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
            placeholder={t('form.notePlaceholder')}
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
            <button type="button" onClick={() => setMode('view')} className="text-[9px] tracking-[var(--tk-25)] text-white/30 outline-none transition-colors duration-500 hover:text-white/60">
              {t('peek.cancel')}
            </button>
            <button type="submit" disabled={saving} className={`${actionClass} disabled:text-white/20`}>
              {saving ? t('peek.saving') : t('peek.save')}
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
            placeholder={t('form.title')}
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
            {tmdbLoadingDetail ? t('loading.fetching') : t('loading.searching')}
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
          {pickedTmdb && <p className="text-[8px] tracking-widest text-white/25">{t('peek.loadedFromTmdb')}</p>}

          <div className="flex w-full gap-2">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={t('form.year')}
              required
              className={`w-1/2 ${fieldClass}`}
            />
            <input
              type="text"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
              placeholder={t('form.director')}
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
                  className="text-[9px] tracking-[var(--tk-25)] text-white/40 outline-none transition-colors duration-500 hover:text-white/70"
                >
                  {t('form.goToThatPoster')}
                </Link>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMode('view')} className="text-[9px] tracking-[var(--tk-25)] text-white/30 outline-none transition-colors duration-500 hover:text-white/60">
              {t('peek.cancel')}
            </button>
            <button type="submit" disabled={saving} className={`${actionClass} disabled:text-white/20`}>
              {saving ? t('peek.saving') : t('peek.save')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
