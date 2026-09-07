'use client'

import { useCallback, useMemo, useState } from 'react'
import { MovieUniverse } from './MovieUniverse'
import { UniverseHistoryRail } from './UniverseHistoryRail'
import { DemoAddStar } from './DemoAddStar'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { MovieSearch } from '@/components/archive/MovieSearch'
import { UniverseInsightPanel } from '@/components/archive/UniverseInsightPanel'
import { summarizeUniverse, rewatchedMovies, genreIndex } from '@/lib/universeInsights'
import { computeHistoryRange } from '@/lib/loggedMovies'
import { movies as staticMovies, type Movie } from '@/data/movies'
import { navLinkClass } from '@/lib/uiStyles'
import type { UniverseText } from '@/lib/universeTexts'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { LocaleToggle } from '@/components/i18n/LocaleToggle'
import type { Locale } from '@/lib/i18n/locale'

// "+ 텍스트" 버튼만 있으면 존재 자체를 못 알아챌 거라는 판단으로, 데모 우주에
// 이미 하나 놓여있는 채로 보여준다 — 원점(반지름 MIN_RADIUS 안쪽, lib/
// universeLayout.ts) 근처엔 어차피 별이 없어서 비어 있는 자리다. onGuestMutate와
// 같은 이유로 이것도 새로고침하면 원래대로 돌아간다(수정/삭제는 자유).
const DEMO_DUMMY_TEXT_CONTENT: Record<Locale, string> = {
  ko: '**텍스트도 여기 이렇게 놓을 수 있어**\n클릭해서 고쳐써봐',
  en: '**you can place text here too**\nclick to edit it',
}

function demoDummyText(locale: Locale): UniverseText {
  return { id: 'demo-dummy-text', content: DEMO_DUMMY_TEXT_CONTENT[locale], x: -20, y: -10, size: 1 }
}

// 비로그인 데모 우주. 실험 삼아 추가한 별(DemoAddStar)도, 24편에 남기는 평점/메모
// (onGuestMutate)도, 자유 텍스트 배치(demoTexts)도 이 컴포넌트가 언마운트되면
// (새로고침 등) 함께 사라진다 — 로그인 없이 "이렇게 쓰는 거예요" 정도만 보여주는
// 게 목적이라 의도적으로 저장하지 않는다. 실제 계정(/archive)의 감상 기록과는
// 완전히 분리된 로컬 상태다.
//
// 탐색/히스토리는 원래 로그인한 본인 우주(계정 드롭다운 안)에만 있었다 — 데모/
// 공유 우주에는 아예 없어서, 여기서도 같은 기능을 체험해볼 수가 없었다는 피드백으로
// 여기도 독립 버튼으로 추가한다(가이드와 같은 자리 방식). "히스토리"는 별도
// 버튼이 아니라 "탐색" 패널 안의 한 줄로 합쳐뒀다 — 좁은 화면에서 하단에 텍스트
// 버튼 두 개가 나란히 있으면 답답해 보인다는 피드백 때문(UniverseInsightPanel의
// historyEligible/onOpenHistory 참고).
export function DemoUniverseStage() {
  const { locale, t } = useLocale()
  const [movies, setMovies] = useState<Movie[]>(staticMovies)
  const [focusMovieId, setFocusMovieId] = useState<string | null>(null)
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)
  // "+ 텍스트" 클릭마다 증가 — ArchiveShell과 같은 "외부 트리거" 패턴. 데모 우주는
  // demoTexts로 MovieUniverse 안에서 로컬 state로만 처리되고 Supabase에는 저장되지
  // 않는다(onGuestMutate 게스트 체험과 같은 이유로 새로고침하면 사라진다).
  const [addTextRequestId, setAddTextRequestId] = useState(0)

  const insights = useMemo(() => summarizeUniverse(movies, locale), [movies, locale])
  const genres = useMemo(() => genreIndex(movies), [movies])
  const rewatched = useMemo(() => rewatchedMovies(movies), [movies])
  const historyRange = useMemo(() => computeHistoryRange(movies), [movies])
  const searchIndex = useMemo(() => movies.map((m) => ({ id: m.id, title: m.title, director: m.director })), [movies])

  const handleGuestMutate = useCallback((movieId: string, mutate: (movie: Movie) => Movie) => {
    setMovies((prev) => prev.map((m) => (m.id === movieId ? mutate(m) : m)))
  }, [])

  // ArchiveShell과 같은 이유로 useCallback으로 고정한다 — MovieSearch의 이펙트가
  // 이 함수를 의존성으로 물고 있어서, 매 렌더 새 함수를 넘기면 무한 렌더 루프에
  // 빠진다(ArchiveShell에서 실제로 겪은 버그, 2026-09-06).
  const handleHighlightChange = useCallback(
    (ids: string[] | null) => setHighlightedIds(ids ? new Set(ids) : null),
    [],
  )

  return (
    <>
      <MovieUniverse
        movies={movies}
        showIdleHint
        focusMovieId={focusMovieId}
        onGuestMutate={handleGuestMutate}
        historyDate={historyDate}
        highlightedIds={highlightedIds}
        demoTexts
        texts={[demoDummyText(locale)]}
        localizedTexts={{ 'demo-dummy-text': DEMO_DUMMY_TEXT_CONTENT }}
        addTextRequestId={addTextRequestId}
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

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-3">
        <MovieSearch searchIndex={searchIndex} onHighlightChange={handleHighlightChange} />
        <button type="button" onClick={() => setAddTextRequestId((n) => n + 1)} className={navLinkClass}>
          {t('nav.addText')}
        </button>
        <LocaleToggle className={navLinkClass} />
        <GuidePanel variant="demo" triggerClassName={navLinkClass} />
      </div>

      <UniverseInsightPanel
        insights={insights}
        genres={genres}
        rewatched={rewatched}
        onFocusMovie={setFocusMovieId}
        onHighlightChange={handleHighlightChange}
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
