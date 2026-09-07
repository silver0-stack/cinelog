'use client'

import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { MovieUniverse } from '@/components/universe/MovieUniverse'
import { UniverseHistoryRail } from '@/components/universe/UniverseHistoryRail'
import { FadeIn } from '@/components/archive/FadeIn'
import { ShareButton } from '@/components/archive/ShareButton'
import { AccountMenu } from '@/components/archive/AccountMenu'
import { UniverseInsightPanel } from '@/components/archive/UniverseInsightPanel'
import { MovieSearch } from '@/components/archive/MovieSearch'
import { LogMovieForm } from '@/components/archive/LogMovieForm'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { useLocaleMenuAction } from '@/components/i18n/LocaleToggle'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { EASE_SLOW } from '@/lib/motion'
import { computeHistoryRange } from '@/lib/loggedMovies'
import { navLinkClass } from '@/lib/uiStyles'
import { genreIndex } from '@/lib/universeInsights'
import type { Movie } from '@/data/movies'
import type { RewatchedMovie, UniverseInsight } from '@/lib/universeInsights'
import type { UniverseText } from '@/lib/universeTexts'

// 데모/공유 우주와 같은 자리, 같은 스타일 — "탐색"(+히스토리)이 로그인 여부와
// 상관없이 항상 화면 하단 왼쪽에 있다는 걸 일관되게 유지한다.
const bottomLeftTriggerClass = `absolute bottom-6 left-4 z-20 sm:left-6 ${navLinkClass}`

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
  texts: UniverseText[]
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
  texts,
}: Props) {
  const router = useRouter()
  const { t } = useLocale()
  const localeMenuAction = useLocaleMenuAction()
  const [focusMovieId, setFocusMovieId] = useState(initialFocusId)
  const [addOpen, setAddOpen] = useState(false)
  // "+ 텍스트" 클릭마다 증가 — MovieUniverse가 이 값의 변화를 감지해 새 텍스트를
  // 만든다(focusMovieId와 같은 "외부 트리거" 패턴).
  const [addTextRequestId, setAddTextRequestId] = useState(0)

  function focusAndClose(id: string) {
    setFocusMovieId(id)
    setAddOpen(false)
  }

  // "우주 성장 히스토리" 범위 — 레이아웃은 그대로 두고 firstWatchedAt만 기준으로
  // 삼으므로, 서버에 새 쿼리를 보낼 필요 없이 이미 있는 movies로 순수 계산한다.
  // (데모/공유 우주와 같은 계산을 쓴다 — lib/loggedMovies.ts)
  const historyRange = useMemo(() => computeHistoryRange(movies), [movies])

  const [historyDate, setHistoryDate] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)
  // 검색과 탐색 인사이트가 같은 하이라이트 메커니즘을 공유한다 — 위치는 그대로
  // 두고 해당 안 하는 별만 어둡게 하는 방식(재배치 없음). 검색창에서 타이핑하는
  // 즉시 우주 안에서 바로 켜지는 별을 보여주고, 인사이트 항목을 누르면 같은
  // 방식으로 그 영화들만 밝힌다 — 하나의 state로 충분하다.
  // useCallback으로 참조를 고정해야 한다 — MovieSearch의 이펙트가 이 함수를
  // 의존성으로 물고 있는데, 매 렌더 새 함수를 넘기면 그 이펙트가 매번 다시
  // 실행되고, 실행될 때마다 setHighlightedIds가 다시 렌더를 유발해 무한
  // 루프("Maximum update depth exceeded")에 빠진다 — 실제로 겪은 버그다.
  const handleHighlightChange = useCallback(
    (ids: string[] | null) => setHighlightedIds(ids ? new Set(ids) : null),
    [],
  )

  const genres = useMemo(() => genreIndex(movies), [movies])

  // (2026-09-06) 가이드를 상단 상시 버튼에서 계정 메뉴 안으로 옮겼다 — todomate
  // 앱의 "프로필 → 설정 → 문의하기(FAQ)" 구조를 참고한 것: 자주 안 쓰는 도움말을
  // 매번 화면에 띄워두는 대신, 계정처럼 "필요할 때 열어보는" 자리로 옮겼다.
  // 데모/공유 우주(로그인 계정 메뉴 자체가 없음)는 그대로 상시 버튼으로 남긴다.
  const [guideOpen, setGuideOpen] = useState(false)

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <FadeIn>
        <MovieUniverse
          movies={movies}
          editable
          movieCardUrls={movieCardUrls}
          focusMovieId={focusMovieId}
          existingByTmdbId={existingByTmdbId}
          historyDate={historyDate}
          highlightedIds={highlightedIds}
          texts={texts}
          addTextRequestId={addTextRequestId}
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
          버튼 글자 자체가 원래 옅어서(당시 text-white/40) 부족했다. 화면 하단
          idle 힌트 문구(MovieUniverse.tsx)가 쓰는 것과 똑같은 진한 텍스트
          그림자를 navLinkClass(lib/uiStyles.ts)에 함께 넣어 해결했다 — 이후
          실사용자 테스트(가족)에서 버튼 존재 자체를 못 알아챘다는 피드백으로
          그 navLinkClass의 명도 자체도 한 번 더 올렸다(white/65로).
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
      <div className="absolute right-4 top-4 z-40 flex items-center gap-2 sm:right-6 sm:top-6 sm:gap-3">
        <ShareButton initialUrl={initialShareUrl} />
        <MovieSearch searchIndex={searchIndex} onHighlightChange={handleHighlightChange} />
        <button type="button" onClick={() => setAddOpen(true)} className={navLinkClass}>
          {t('nav.addLog')}
        </button>
        <button type="button" onClick={() => setAddTextRequestId((n) => n + 1)} className={navLinkClass}>
          {t('nav.addText')}
        </button>
        <AccountMenu
          email={email}
          menuActions={[{ label: t('nav.guide'), onClick: () => setGuideOpen(true) }, localeMenuAction]}
        />
        <GuidePanel variant="archive" open={guideOpen} onOpenChange={setGuideOpen} />
      </div>

      {/* 가이드/탐색/히스토리 전부 예전엔 계정 드롭다운 안에 있었다 — 데모/공유
          우주에서는 셋 다 화면에 항상 보이는 독립 버튼인데 로그인한 내 우주에서만
          "계정" 아이콘을 눌러야 나오는 게 일관성이 없다는 피드백. 계정 메뉴는
          이제 이메일 확인/로그아웃 전용으로만 남기고, 나머지는 데모/공유와 같은
          자리(가이드는 위 오른쪽 버튼 줄, 탐색+히스토리는 아래 왼쪽)로 옮긴다. */}
      <UniverseInsightPanel
        insights={insights}
        genres={genres}
        rewatched={rewatched}
        onFocusMovie={setFocusMovieId}
        onHighlightChange={handleHighlightChange}
        triggerClassName={bottomLeftTriggerClass}
        panelClassName="absolute bottom-14 left-4 z-20 sm:left-6"
        historyEligible={historyRange !== null}
        onOpenHistory={() => historyRange && setHistoryDate(historyRange.min)}
      />

      {/* GuidePanel과 같은 이유로 document.body에 포탈한다 — z-index 숫자만으로는
          믿을 수 없다는 걸 이미 한 번 겪었다(우주 안 위성이 자기만의 스택
          컨텍스트를 만들어서, 그냥 형제 요소로 두는 것만으로는 부모 트리 어딘가의
          숨은 스택 컨텍스트에 갇힐 수 있다). 확실하게 벗어나는 쪽을 택한다. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {addOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_SLOW }}
                className="themed-scroll fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/95 px-6 py-16 sm:items-center"
                onClick={() => setAddOpen(false)}
              >
                <div className="flex w-full max-w-sm flex-col items-center gap-16" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="self-start text-[11px] font-light tracking-[var(--tk-35)] text-white/45 outline-none transition-colors duration-500 hover:text-white/85"
                  >
                    {t('nav.closeArrow')}
                  </button>
                  <h1 className="-mt-10 text-center text-sm font-light tracking-[var(--tk-55)] text-white/70">{t('nav.logMovie')}</h1>
                  <LogMovieForm existingByTmdbId={existingByTmdbId} onFocusMovie={focusAndClose} onSaved={() => router.refresh()} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </main>
  )
}
