'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import type { UniverseInsight } from '@/lib/universeInsights'

const triggerClass =
  'absolute left-6 top-6 z-10 text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// 왓챠피디아류 리스트가 못 보여주는 것 — 항목이 아니라 항목 사이의 관계가 만든
// 패턴 — 을 짧은 텍스트로 노출한다. 상시 노출하지 않는다: 화면이 복잡해지는
// 걸 피하려고 다른 nav 링크처럼 클릭해야만 열리는 절제된 토글로 둔다.
export function UniverseInsightPanel({ insights }: { insights: UniverseInsight[] }) {
  const [open, setOpen] = useState(false)

  if (insights.length === 0) return null

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass}>
        패턴
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE_SLOW }}
            className="pointer-events-none absolute bottom-10 left-6 z-10 flex flex-col gap-2"
          >
            {insights.map((insight) => (
              <p
                key={insight.label}
                className="text-[11px] font-light tracking-[0.25em] text-white/35"
              >
                {insight.label} — {insight.value} ({insight.detail})
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
