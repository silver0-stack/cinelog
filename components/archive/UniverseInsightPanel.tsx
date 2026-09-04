'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'
import { useClickOutside } from '@/lib/useClickOutside'
import type { UniverseInsight } from '@/lib/universeInsights'

const defaultTriggerClass =
  'absolute bottom-6 left-4 z-10 text-xs font-light tracking-[0.2em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 sm:left-6 sm:tracking-[0.4em]'
const defaultPanelClass = 'absolute bottom-14 left-4 z-10 sm:left-6'

type Props = {
  insights: UniverseInsight[]
  triggerClassName?: string
  panelClassName?: string
  /** 지정하면 controlled 모드 — 자체 트리거 버튼을 그리지 않고, 외부(예: 계정
   * 드롭다운 메뉴의 "패턴" 항목)에서 열고 닫는다. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// 왓챠피디아류 리스트가 못 보여주는 것 — 항목이 아니라 항목 사이의 관계가 만든
// 패턴 — 을 짧은 텍스트로 노출한다. 상시 노출하지 않는다: 화면이 복잡해지는
// 걸 피하려고 다른 nav 링크처럼 클릭해야만 열리는 절제된 토글로 둔다.
export function UniverseInsightPanel({ insights, triggerClassName, panelClassName, open: openProp, onOpenChange }: Props) {
  const controlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlled ? openProp : internalOpen
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setInternalOpen(v))
  const panelRef = useRef<HTMLDivElement>(null)
  useClickOutside(panelRef, open, () => setOpen(false))

  if (insights.length === 0) return null

  return (
    <>
      {!controlled && (
        <button type="button" onClick={() => setOpen(!open)} className={triggerClassName ?? defaultTriggerClass}>
          패턴
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
            className={`flex flex-col gap-2 border border-white/10 bg-black px-3 py-3 ${panelClassName ?? defaultPanelClass}`}
          >
            {insights.map((insight) => (
              <p
                key={insight.label}
                className="text-[10px] font-light leading-relaxed tracking-[0.15em] text-white/35 sm:text-[11px] sm:tracking-[0.25em]"
              >
                {insight.label} — {insight.value} ({insight.detail})
              </p>
            ))}
            {/* 예전엔 트리거를 다시 누르면 닫혔는데(토글), controlled 모드(계정
                드롭다운에서 여는 지금)는 그 트리거가 안 보여서 닫을 방법이
                아예 없었다 — 배경 클릭으로도 닫히지만, 닫는 방법 자체를
                명시적으로 보여주는 버튼도 둔다(가이드 패널과 같은 패턴). */}
            <button type="button" onClick={() => setOpen(false)} className={`mt-1 ${secondaryNavLinkClass}`}>
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
