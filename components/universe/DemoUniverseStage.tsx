'use client'

import { useCallback, useMemo, useState } from 'react'
import { MovieUniverse } from './MovieUniverse'
import { UniverseHistoryRail } from './UniverseHistoryRail'
import { DemoAddStar } from './DemoAddStar'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { UniverseInsightPanel } from '@/components/archive/UniverseInsightPanel'
import { summarizeUniverse, rewatchedMovies, genreIndex } from '@/lib/universeInsights'
import { computeHistoryRange } from '@/lib/loggedMovies'
import { movies as staticMovies, type Movie } from '@/data/movies'
import { navLinkClass } from '@/lib/uiStyles'
import type { GroupMode } from '@/lib/universeLayout'

// 비로그인 데모 우주. 실험 삼아 추가한 별(DemoAddStar)도, 24편에 남기는 평점/메모
// (onGuestMutate)도 이 컴포넌트가 언마운트되면(새로고침 등) 함께 사라진다 —
// 로그인 없이 "이렇게 쓰는 거예요" 정도만 보여주는 게 목적이라 의도적으로 저장하지
// 않는다. 실제 계정(/archive)의 감상 기록과는 완전히 분리된 로컬 상태다.
//
// 탐색/히스토리는 원래 로그인한 본인 우주(계정 드롭다운 안)에만 있었다 — 데모/
// 공유 우주에는 아예 없어서, 여기서도 같은 기능을 체험해볼 수가 없었다는 피드백으로
// 여기도 독립 버튼으로 추가한다(가이드와 같은 자리 방식). "히스토리"는 별도
// 버튼이 아니라 "탐색" 패널 안의 한 줄로 합쳐뒀다 — 좁은 화면에서 하단에 텍스트
// 버튼 두 개가 나란히 있으면 답답해 보인다는 피드백 때문(UniverseInsightPanel의
// historyEligible/onOpenHistory 참고).
export function DemoUniverseStage() {
  const [movies, setMovies] = useState<Movie[]>(staticMovies)
  const [focusMovieId, setFocusMovieId] = useState<string | null>(null)
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('genre')

  const insights = useMemo(() => summarizeUniverse(movies), [movies])
  const genres = useMemo(() => genreIndex(movies), [movies])
  const rewatched = useMemo(() => rewatchedMovies(movies), [movies])
  const historyRange = useMemo(() => computeHistoryRange(movies), [movies])

  const handleGuestMutate = useCallback((movieId: string, mutate: (movie: Movie) => Movie) => {
    setMovies((prev) => prev.map((m) => (m.id === movieId ? mutate(m) : m)))
  }, [])

  return (
    <>
      <MovieUniverse
        movies={movies}
        showIdleHint
        focusMovieId={focusMovieId}
        onGuestMutate={handleGuestMutate}
        historyDate={historyDate}
        highlightedIds={highlightedIds}
        groupMode={groupMode}
      />

      {historyRange && historyDate !== null && (
        <UniverseHistoryRail
          minDate={historyRange.min}
          maxDate={historyRange.max}
          value={historyDate}
          onChange={setHistoryDate}
          onExit={() => setHistoryDate(null)}
        />
      )}

      {/* "이게 뭐야, 언니가 본거야?" 하는 혼란을 정직한 라벨 한 줄로 없앤다 —
          별도 시스템처럼 안 느껴지게, 큐레이션이라고 밝힌다. 예전엔 여기에
          제작자 본인의 실제 아카이브로 가는 링크를 같이 붙여뒀는데, 바이럴
          트래픽 앞에 실제 평점/메모(꽤 개인적인 감상)를 상시 노출하는 셈이라
          빼기로 했다 — 공유 링크는 "링크를 받은 사람만 본다"가 원칙인데 데모에
          박아두면 사실상 전체 공개가 된다. */}
      <div className="absolute left-6 top-6 z-10 flex flex-col items-start gap-1.5">
        <p className="pointer-events-none text-[10px] font-light tracking-[0.25em] text-white/25">
          데모 우주 · 내가 고른 24편
        </p>
      </div>

      <GuidePanel variant="demo" triggerClassName={`absolute right-6 top-6 z-10 ${navLinkClass}`} />

      <UniverseInsightPanel
        insights={insights}
        genres={genres}
        groupMode={groupMode}
        onGroupModeChange={setGroupMode}
        rewatched={rewatched}
        onFocusMovie={setFocusMovieId}
        onHighlightChange={(ids) => setHighlightedIds(ids ? new Set(ids) : null)}
        triggerClassName={`absolute bottom-6 left-4 z-10 sm:left-6 ${navLinkClass}`}
        panelClassName="absolute bottom-14 left-4 z-10 sm:left-6"
        historyEligible={historyRange !== null}
        onOpenHistory={() => historyRange && setHistoryDate(historyRange.min)}
      />

      <DemoAddStar
        onAdd={(movie) => {
          setMovies((prev) => [...prev, movie])
          setFocusMovieId(movie.id)
        }}
      />
    </>
  )
}
