'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MovieUniverse } from './MovieUniverse'
import { UniverseHistoryRail } from './UniverseHistoryRail'
import { FadeIn } from '@/components/archive/FadeIn'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { UniverseInsightPanel } from '@/components/archive/UniverseInsightPanel'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { computeHistoryRange } from '@/lib/loggedMovies'
import { genreIndex } from '@/lib/universeInsights'
import { navLinkClass } from '@/lib/uiStyles'
import type { Movie } from '@/data/movies'
import type { RewatchedMovie, UniverseInsight } from '@/lib/universeInsights'
import type { UniverseText } from '@/lib/universeTexts'

// 탐색/히스토리는 원래 로그인한 본인 우주(계정 드롭다운 안)에만 있었다 — 남의
// 공유 우주를 구경하러 온 사람도 "이 사람이 뭘 좋아하는지"(탐색)나 "이 우주가
// 어떻게 자라왔는지"(히스토리)를 똑같이 볼 수 있으면 좋겠다는 피드백으로 여기도
// 추가한다. editable이 아니라 순수 조회/시각 효과라 읽기 전용 화면에도 안전하다.
// "히스토리"는 별도 버튼이 아니라 "탐색" 패널 안의 한 줄로 합쳐뒀다 — 모바일에서
// 왼쪽에 텍스트 버튼 두 개, 오른쪽에 "나도 기록하기"까지 있으니 답답해 보인다는
// 피드백 때문(UniverseInsightPanel의 historyEligible/onOpenHistory 참고).
export function SharedUniverseShell({
  movies,
  insights,
  rewatched,
  texts,
}: {
  movies: Movie[]
  insights: UniverseInsight[]
  rewatched: RewatchedMovie[]
  texts: UniverseText[]
}) {
  const { t } = useLocale()
  const [focusMovieId, setFocusMovieId] = useState<string | null>(null)
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)

  const historyRange = useMemo(() => computeHistoryRange(movies), [movies])
  const genres = useMemo(() => genreIndex(movies), [movies])

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <FadeIn>
        <MovieUniverse
          movies={movies}
          showIdleHint
          focusMovieId={focusMovieId}
          historyDate={historyDate}
          highlightedIds={highlightedIds}
          texts={texts}
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

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-3">
        <LocaleToggle className={navLinkClass} />
        <GuidePanel variant="shared" triggerClassName={navLinkClass} />
      </div>

      <UniverseInsightPanel
        insights={insights}
        genres={genres}
        rewatched={rewatched}
        onFocusMovie={setFocusMovieId}
        onHighlightChange={(ids) => setHighlightedIds(ids ? new Set(ids) : null)}
        triggerClassName={`absolute bottom-6 left-4 z-10 sm:left-6 ${navLinkClass}`}
        panelClassName="absolute bottom-14 left-4 z-10 sm:left-6"
        historyEligible={historyRange !== null}
        onOpenHistory={() => historyRange && setHistoryDate(historyRange.min)}
      />

      <Link href="/login" className={`absolute bottom-6 right-6 z-10 ${navLinkClass}`}>
        {t('nav.iAlsoWantToLog')}
      </Link>
    </main>
  )
}
