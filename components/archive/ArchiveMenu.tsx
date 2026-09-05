'use client'

import { useState } from 'react'
import { AccountMenu } from './AccountMenu'
import { UniverseInsightPanel } from './UniverseInsightPanel'
import { GuidePanel } from '@/components/guide/GuidePanel'
import type { RewatchedMovie, UniverseInsight } from '@/lib/universeInsights'

// 가이드/탐색은 예전엔 화면 구석에 항상 떠 있는 트리거였다 — 자주 안 쓰는
// 부가 기능이 마치 주요 기능처럼 보인다는 피드백으로, 둘 다 계정 드롭다운
// 메뉴 안으로 옮겼다. 이 컴포넌트가 그 셋(계정/가이드/탐색)의 열림 상태를
// 한곳에서 조율한다.
export function ArchiveMenu({
  email,
  insights,
  rewatched,
  onFocusMovie,
  historyEligible,
  onOpenHistory,
}: {
  email: string
  insights: UniverseInsight[]
  rewatched: RewatchedMovie[]
  onFocusMovie: (id: string) => void
  /** 기록 수가 리플레이할 만큼 쌓였는지 — 너무 적으면 "히스토리" 메뉴 자체를 숨긴다. */
  historyEligible: boolean
  onOpenHistory: () => void
}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [patternOpen, setPatternOpen] = useState(false)

  // 이름을 "패턴"에서 "탐색"으로 바꿨다 — 영화 검색이 여기 있을 땐 "패턴"이라는
  // 이름과 결이 안 맞았는데(패턴=발견, 검색=이미 아는 걸 바로 찾기), 검색은
  // MovieSearch.tsx로 분리되고 여기는 재관람 목록/감독·장르 요약만 남아서
  // 지금은 이름이 안 맞지는 않지만, 랜딩 페이지의 "탐색한다" 어휘와 이어지는
  // "탐색"을 그대로 유지한다.
  const menuActions = [
    { label: '가이드', onClick: () => setGuideOpen(true) },
    ...(insights.length > 0 || rewatched.length > 0 ? [{ label: '탐색', onClick: () => setPatternOpen(true) }] : []),
    ...(historyEligible ? [{ label: '히스토리', onClick: onOpenHistory }] : []),
  ]

  return (
    <>
      <AccountMenu email={email} menuActions={menuActions} />
      <GuidePanel variant="archive" open={guideOpen} onOpenChange={setGuideOpen} />
      <UniverseInsightPanel
        insights={insights}
        rewatched={rewatched}
        onFocusMovie={onFocusMovie}
        open={patternOpen}
        onOpenChange={setPatternOpen}
        panelClassName="absolute right-4 top-16 z-20 sm:right-6"
      />
    </>
  )
}
