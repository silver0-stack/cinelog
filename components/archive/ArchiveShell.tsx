'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { MovieUniverse } from '@/components/universe/MovieUniverse'
import { UniverseHistoryRail } from '@/components/universe/UniverseHistoryRail'
import { FadeIn } from '@/components/archive/FadeIn'
import { ShareButton } from '@/components/archive/ShareButton'
import { ArchiveMenu } from '@/components/archive/ArchiveMenu'
import { MovieSearch } from '@/components/archive/MovieSearch'
import { LogMovieForm } from '@/components/archive/LogMovieForm'
import { EASE_SLOW } from '@/lib/motion'
import { firstWatchedAt } from '@/lib/loggedMovies'
import type { Movie } from '@/data/movies'
import type { RewatchedMovie, UniverseInsight } from '@/lib/universeInsights'

// 기록이 이 미만이면 "우주 성장 히스토리" 리플레이가 허전해 보인다는 CLAUDE.md의
// 리스크 판단(5~10편 미만)에 따라, 메뉴 자체를 숨긴다.
const MIN_HISTORY_MOVIES = 8

const navLinkClass =
  'text-xs font-light tracking-[0.2em] sm:tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// <button>은 부모의 text-shadow를 자동으로 물려받지 않는(폼 컨트롤이라 그런)
// 브라우저 기본 동작이 있어서, 화면 위쪽의 밝은 포스터 위에서도 글자가
// 읽히려면 버튼 자신에 직접 걸어야 한다(MovieUniverse의 idle 힌트와 같은 값).
const navTextShadow = { textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }

type Props = {
  movies: Movie[]
  movieCardUrls: Record<string, string>
  existingByTmdbId: Record<number, string>
  /** /archive?focus=... 로 들어온 경우(외부 딥링크)의 초기값. 검색/재관람 목록
   * 클릭은 이제 이 URL을 거치지 않고 아래 focusMovieId state를 직접 바꾼다. */
  initialFocusId: string | null
  initialShareUrl: string | null
  email: string
  insights: UniverseInsight[]
  rewatched: RewatchedMovie[]
  searchIndex: { id: string; title: string; director: string }[]
}

// 검색/재관람 목록에서 영화를 고르면 이전엔 `/archive?focus=<id>` 링크로
// 이동시켰는데, 이 페이지가 매번 새로 Supabase에서 영화/감상/관계를 전부 다시
// 불러오는 서버 컴포넌트라(요청마다 5번의 쿼리) 클릭하고 카메라가 움직이기까지
// 3초 가까이 걸렸다 — 이미 브라우저에 다 로드된 영화로 "카메라만" 이동하는
// 건데 서버 왕복까지 할 이유가 없다. 그래서 focusMovieId를 URL이 아니라 이
// 클라이언트 컴포넌트의 state로 옮겼다 — 검색/재관람 목록은 이제 Link가 아니라
// 이 state를 직접 바꾸는 콜백을 부른다(서버 왕복 없이 즉시 카메라 이동).
// 외부에서 `/archive?focus=<id>` 링크로 들어온 경우(첫 로드)만 여전히 URL을
// 초기값으로 받는다.
//
// "+ 기록"도 같은 이유로 별도 페이지(/archive/new) 대신 이 화면 위 모달로
// 바꿨다 — 잘못 눌렀을 때 "완전히 다른 창으로 갔다가 돌아오는" 느낌이었고,
// 영화가 많으면 돌아올 때마다 다시 몇 초씩 걸렸다. 모달이면 배경 클릭/닫기로
// 그냥 취소하면 그만이고, 애초에 우주를 벗어나지 않으니 돌아올 때 다시 불러올
//것도 없다. 실제로 저장에 성공했을 때만 `router.refresh()`로 서버 데이터를
// 조용히 갱신한다(성공 시에만 발생하는 드문 이벤트라, 모달을 열고 취소하는
// 흔한 경로는 여전히 서버 왕복이 전혀 없다). 첫 기록(우주가 비어있을 때)은
// 이 컴포넌트 자체가 아직 없는 상태라 여전히 /archive/new 페이지를 그대로 쓴다.
export function ArchiveShell({
  movies,
  movieCardUrls,
  existingByTmdbId,
  initialFocusId,
  initialShareUrl,
  email,
  insights,
  rewatched,
  searchIndex,
}: Props) {
  const router = useRouter()
  const [focusMovieId, setFocusMovieId] = useState(initialFocusId)
  const [addOpen, setAddOpen] = useState(false)

  function focusAndClose(id: string) {
    setFocusMovieId(id)
    setAddOpen(false)
  }

  // "우주 성장 히스토리" 범위 — 레이아웃은 그대로 두고 firstWatchedAt만 기준으로
  // 삼으므로, 서버에 새 쿼리를 보낼 필요 없이 이미 있는 movies로 순수 계산한다.
  const historyRange = useMemo(() => {
    if (movies.length < MIN_HISTORY_MOVIES) return null
    const dates = movies.map(firstWatchedAt).filter(Boolean).sort()
    if (dates.length === 0) return null
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [movies])

  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <FadeIn>
        <MovieUniverse
          movies={movies}
          defaultCenterId={movies[0].id}
          editable
          movieCardUrls={movieCardUrls}
          focusMovieId={focusMovieId}
          existingByTmdbId={existingByTmdbId}
          historyDate={historyDate}
          highlightedIds={highlightedIds}
        />
      </FadeIn>
      {historyRange && historyDate !== null && (
        <UniverseHistoryRail
          minDate={historyRange.min}
          maxDate={historyRange.max}
          value={historyDate}
          onChange={setHistoryDate}
          onExit={() => setHistoryDate(null)}
        />
      )}
      {/* 상단 우측 상시 버튼들(검색/+기록/계정 등)이 화면 위쪽을 지나가는 밝은
          포스터·글로우와 겹치면 거의 안 보인다는 피드백 — 그라데이션만으로는
          버튼 글자 자체가 원래 옅어서(text-white/40) 부족했다. 대신 이
          우주에서 이미 검증된 방식을 그대로 가져왔다: 화면 하단 idle 힌트
          문구(MovieUniverse.tsx)가 쓰는 것과 똑같은 진한 텍스트 그림자.
          <button>은 부모의 text-shadow를 자동으로 안 물려받는(폼 컨트롤이라
          그런) 브라우저 기본 동작이 있어서, 버튼들은 각자 자기 컴포넌트
          안에서 직접 건다(navTextShadow).
          이 띠는 클릭도 막아야 한다 — 처음엔 pointer-events-none으로 순전히
          장식이었는데, 모바일에서 버튼 사이 여백(예: "검색"과 "+ 기록" 사이
          gap)을 눌렀을 때 그 아래 별이 클릭돼서 엉뚱한 영화로 줌인되는
          문제가 있었다(버튼이 없는 빈 픽셀은 이 띠를 그냥 통과해 바로 아래
          별에 닿았다). pointer-events-auto로 바꿔서 이 띠 전체가 클릭을
          가로채게 한다 — 실제 버튼들은 z-40으로 이 띠(z-30)보다 위에 있으니
          자기 자리에서는 여전히 정상 클릭되고, 버튼이 없는 빈 자리를 누르면
          이제 그냥 아무 일도 안 일어난다(별로 새는 대신). */}
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute inset-x-0 top-0 z-30 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent"
      />
      <div className="absolute right-4 top-4 z-40 flex items-center gap-3 sm:right-6 sm:top-6 sm:gap-8">
        <ShareButton initialUrl={initialShareUrl} />
        <MovieSearch searchIndex={searchIndex} onSelect={setFocusMovieId} />
        <button type="button" onClick={() => setAddOpen(true)} className={navLinkClass} style={navTextShadow}>
          + 기록
        </button>
        <ArchiveMenu
          email={email}
          insights={insights}
          rewatched={rewatched}
          onFocusMovie={setFocusMovieId}
          onHighlightChange={(ids) => setHighlightedIds(ids ? new Set(ids) : null)}
          historyEligible={historyRange !== null}
          onOpenHistory={() => historyRange && setHistoryDate(historyRange.min)}
        />
      </div>

      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SLOW }}
            className="themed-scroll fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/95 px-6 py-16 sm:items-center"
            onClick={() => setAddOpen(false)}
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-16" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="self-start text-[11px] font-light tracking-[0.35em] text-white/45 outline-none transition-colors duration-500 hover:text-white/85"
              >
                ← 닫기
              </button>
              <h1 className="-mt-10 text-center text-sm font-light tracking-[0.55em] text-white/70">영화 기록하기</h1>
              <LogMovieForm existingByTmdbId={existingByTmdbId} onFocusMovie={focusAndClose} onSaved={() => router.refresh()} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
