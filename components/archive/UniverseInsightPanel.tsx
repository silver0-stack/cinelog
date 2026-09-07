'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { navLinkClass, secondaryNavLinkClass } from '@/lib/uiStyles'
import { useClickOutside } from '@/lib/useClickOutside'
import { OrbitIcon } from '@/components/icons/OrbitIcon'
import type { RewatchedMovie, UniverseInsight } from '@/lib/universeInsights'
import { useLocale } from '@/components/i18n/LocaleProvider'

const defaultTriggerClass = `absolute bottom-6 left-4 z-10 sm:left-6 ${navLinkClass}`
const defaultPanelClass = 'absolute bottom-14 left-4 z-10 sm:left-6'

// "탐색"이라는 이름만 보고는 이 패널이 뭘 보여주는지 감이 안 올 수 있어서,
// 처음 열었을 때 딱 한 번만 짧게 알려준다(로컬스토리지로 기억).
const INSIGHT_HINT_KEY = 'cinelog:hint-seen:insight'

type Props = {
  insights: UniverseInsight[]
  /** 이 우주에 실제로 존재하는 장르만(1편도 없는 칩은 아예 안 보여준다) — 누르면
   * 그 장르의 영화만 밝힌다. Figma 목업의 "하단 장르 바로 눌러 필터링" 아이디어를
   * 새 바를 추가하는 대신 이미 있는 탐색 패널 안에 얹었다 — 화면 하단에 트리거를
   * 또 늘리면 방금 정리한 모바일 버튼 과밀 문제가 재발하기 때문. */
  genres?: { genre: string; movieIds: string[] }[]
  /** 개수 많은 순으로 정렬된, 2번 이상 감상을 남긴 영화들 — 시간이 지나면 어떤
   * 영화에 감상 타래가 몇 개 쌓였는지 스스로도 기억 안 난다는 피드백으로 추가. */
  rewatched?: RewatchedMovie[]
  /** 재관람 목록 항목을 누르면 그 영화로 카메라를 옮긴다 — URL 이동(서버
   * 왕복) 없이 즉시 옮기려고 콜백으로 받는다(ArchiveShell의 focusMovieId
   * state를 직접 바꾼다). */
  onFocusMovie?: (id: string) => void
  /** 인사이트 항목을 누르면 그 movieIds를, 다시 누르거나 패널을 닫으면 null을
   * 준다 — 위치는 그대로 두고 해당 별만 밝히는 "하이라이트"에 쓴다(재배치는
   * 하지 않는다: 위치는 항상 중심과의 관계로만 정해진다는 규칙을 지킨다). */
  onHighlightChange?: (ids: string[] | null) => void
  triggerClassName?: string
  panelClassName?: string
  /** 지정하면 controlled 모드 — 자체 트리거 버튼을 그리지 않고, 외부(예: 계정
   * 드롭다운 메뉴의 "탐색" 항목)에서 열고 닫는다. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** 기록 수가 리플레이할 만큼 쌓였는지 — true면 패널 안에 "히스토리 보기" 줄을
   * 더한다. 예전엔 이 우주 화면 하단에 "탐색"과 "히스토리" 버튼이 나란히 있었는데,
   * 좁은 화면에서 두 개가 붙어 있으니 답답해 보인다는 피드백으로 하나로 합쳤다 —
   * "탐색"을 열면 그 안에서 히스토리로도 갈 수 있게. */
  historyEligible?: boolean
  onOpenHistory?: () => void
}

// 왓챠피디아류 리스트가 못 보여주는 것 — 항목이 아니라 항목 사이의 관계가 만든
// 패턴 — 을 짧은 텍스트로 노출한다. 상시 노출하지 않는다: 화면이 복잡해지는
// 걸 피하려고 다른 nav 링크처럼 클릭해야만 열리는 절제된 토글로 둔다.
//
// 영화 검색은 여기 있다가 MovieSearch.tsx로 분리했다 — 검색은 자주 쓸
// 유틸리티라 상시 노출 트리거로 승격시켰고, 여기 남은 재관람 목록/감독·장르
// 요약은 "가끔 궁금해서 보는" 성격이라 한 단계 안(계정 드롭다운의 "탐색")에
// 있어도 괜찮다고 판단했다.
export function UniverseInsightPanel({
  insights,
  genres = [],
  rewatched = [],
  onFocusMovie,
  onHighlightChange,
  triggerClassName,
  panelClassName,
  open: openProp,
  onOpenChange,
  historyEligible = false,
  onOpenHistory,
}: Props) {
  const { t } = useLocale()
  const controlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlled ? openProp : internalOpen
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setInternalOpen(v))
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside(panelRef, open, () => setOpen(false))

  // 인사이트 항목과 장르 칩이 같은 하이라이트 토글을 공유한다 — 키만 서로 안
  // 겹치게 구분한다(인사이트 라벨은 "가장 짙은 중력" 같은 고정 문구라 장르명과
  // 겹칠 일은 없지만, 접두사로 명시해서 확실히 한다).
  const [activeKey, setActiveKey] = useState<string | null>(null)
  function toggleActive(key: string, movieIds: string[]) {
    if (activeKey === key) {
      setActiveKey(null)
      onHighlightChange?.(null)
    } else {
      setActiveKey(key)
      onHighlightChange?.(movieIds)
    }
  }
  // 패널을 닫으면(배경 클릭/닫기 버튼/재관람 목록 클릭 등 경로 무관하게) 하이라이트도
  // 같이 지운다 — 안 그러면 패널만 닫혀있고 우주는 계속 어두운 채로 남아서 "왜
  // 이렇게 됐지" 하는 상태가 된다. 다시 켜려면 패널을 열어서 또 눌러야 한다.
  useEffect(() => {
    if (open) return
    setActiveKey(null)
    onHighlightChange?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [showHint, setShowHint] = useState(false)
  useEffect(() => {
    if (!open) return
    try {
      if (!localStorage.getItem(INSIGHT_HINT_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowHint(true)
        localStorage.setItem(INSIGHT_HINT_KEY, '1')
      }
    } catch {
      // 로컬스토리지를 못 쓰는 환경에서는 그냥 힌트 없이 넘어간다.
    }
  }, [open])

  if (insights.length === 0 && genres.length === 0 && rewatched.length === 0 && !historyEligible) return null

  return (
    <>
      {!controlled && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 ${triggerClassName ?? defaultTriggerClass}`}
        >
          <OrbitIcon />
          {t('nav.explore')}
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE_SLOW }}
            // 너비를 안 정해뒀더니 한 줄짜리 통계 문장 길이에 따라 박스가
            // 제멋대로 넓어지거나 좁아져서 답답해 보였다 — 고정폭을 주고
            // 문장은 자연스럽게 줄바꿈되게 한다. Tailwind 임의값 클래스가
            // 실제로는 안 먹은 적이 있어서 인라인 스타일로 확실하게 건다.
            style={{ width: 'min(72vw, 240px)' }}
            className={`flex flex-col gap-3 border border-white/10 bg-black px-3 py-3 ${panelClassName ?? defaultPanelClass}`}
          >
            {showHint && (
              <p className="text-[9px] leading-relaxed tracking-wide text-white/30">{t('insight.hint')}</p>
            )}

            {rewatched.length > 0 && (
              <div className="themed-scroll flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
                {rewatched.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onFocusMovie?.(m.id)
                      setOpen(false)
                    }}
                    className="flex items-baseline justify-between gap-2 border-b border-white/5 py-1 text-left text-[10px] font-light tracking-wide text-white/60 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white"
                  >
                    <span className="truncate">{m.title}</span>
                    {/* "×2"는 문맥 없이 보면 뭔지 알기 힘들다는 피드백 —
                        "N회"는 그 자체로 "N번 봤다"는 뜻이 바로 읽힌다. */}
                    <span className="shrink-0 text-white/25">{t('insight.rewatchCount', { count: m.count })}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 인사이트 항목을 누르면 위치는 그대로 두고 그 영화들만 밝히고
                나머지는 어둡게 한다("하이라이트") — 재배치는 절대 안 한다.
                다시 누르면 꺼진다(대칭적인 토글). */}
            {insights.map((insight) => (
              <button
                key={insight.label}
                type="button"
                onClick={() => toggleActive(insight.label, insight.movieIds)}
                className={`text-left text-[10px] font-light leading-relaxed tracking-[0.15em] outline-none transition-colors duration-300 sm:text-[11px] sm:tracking-[0.25em] ${
                  activeKey === insight.label ? 'text-white/80' : 'text-white/35 hover:text-white/60'
                }`}
              >
                {t('insight.summary', { label: insight.label, value: insight.value, detail: insight.detail })}
              </button>
            ))}

            {/* 장르 칩 — 이 우주에 실제로 있는 장르만 보여준다. 같은 하이라이트
                토글이라 인사이트 항목과 동작이 똑같다: 누르면 그 장르만 밝고
                나머지는 어두워지고, 다시 누르면 꺼진다. */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                {genres.map(({ genre, movieIds }) => {
                  const key = `genre:${genre}`
                  const active = activeKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleActive(key, movieIds)}
                      className={`border px-2 py-0.5 text-[10px] font-light tracking-wide outline-none transition-colors duration-300 ${
                        active ? 'border-white/50 text-white/90' : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
                      }`}
                    >
                      {t(`genre.${genre}`)}
                    </button>
                  )
                })}
              </div>
            )}

            {historyEligible && onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onOpenHistory()
                  setOpen(false)
                }}
                className="border-t border-white/10 pt-3 text-left text-[10px] font-light tracking-[var(--tk-15)] text-white/35 outline-none transition-colors duration-300 hover:text-white/60 sm:text-[11px] sm:tracking-[var(--tk-25)]"
              >
                {t('nav.viewHistory')}
              </button>
            )}

            {/* 예전엔 트리거를 다시 누르면 닫혔는데(토글), controlled 모드(계정
                드롭다운에서 여는 지금)는 그 트리거가 안 보여서 닫을 방법이
                아예 없었다 — 배경 클릭으로도 닫히지만, 닫는 방법 자체를
                명시적으로 보여주는 버튼도 둔다(가이드 패널과 같은 패턴). */}
            <button type="button" onClick={() => setOpen(false)} className={secondaryNavLinkClass}>
              {t('nav.close')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
