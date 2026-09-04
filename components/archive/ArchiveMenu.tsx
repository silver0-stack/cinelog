'use client'

import { useState } from 'react'
import { AccountMenu } from './AccountMenu'
import { UniverseInsightPanel } from './UniverseInsightPanel'
import { GuidePanel } from '@/components/guide/GuidePanel'
import type { UniverseInsight } from '@/lib/universeInsights'

// 가이드/패턴은 예전엔 화면 구석에 항상 떠 있는 트리거였다 — 자주 안 쓰는
// 부가 기능이 마치 주요 기능처럼 보인다는 피드백으로, 둘 다 계정 드롭다운
// 메뉴 안으로 옮겼다. 이 컴포넌트가 그 셋(계정/가이드/패턴)의 열림 상태를
// 한곳에서 조율한다.
export function ArchiveMenu({ email, insights }: { email: string; insights: UniverseInsight[] }) {
  const [guideOpen, setGuideOpen] = useState(false)
  const [patternOpen, setPatternOpen] = useState(false)

  const menuActions = [
    { label: '가이드', onClick: () => setGuideOpen(true) },
    ...(insights.length > 0 ? [{ label: '패턴', onClick: () => setPatternOpen(true) }] : []),
  ]

  return (
    <>
      <AccountMenu email={email} menuActions={menuActions} />
      <GuidePanel variant="archive" open={guideOpen} onOpenChange={setGuideOpen} />
      <UniverseInsightPanel
        insights={insights}
        open={patternOpen}
        onOpenChange={setPatternOpen}
        panelClassName="absolute right-4 top-16 z-20 sm:right-6"
      />
    </>
  )
}
