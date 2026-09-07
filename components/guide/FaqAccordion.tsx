'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import type { QA } from '@/lib/guideContent'

// GuidePanel(팝업)과 아카이브 설정 페이지(/archive/settings, 페이지 한 섹션)가
// 같은 아코디언 마크업을 공유한다 — 담기는 자리만 다르고 "질문만 먼저 훑고
// 궁금한 것만 펼쳐본다"는 동작은 둘 다 같아야 한다(2026-09-08).
export function FaqAccordion({ items }: { items: QA[] }) {
  const [openQ, setOpenQ] = useState<string | null>(null)

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const expanded = openQ === item.q
        return (
          <li key={item.q} className="border-b border-white/5 last:border-none">
            <button
              type="button"
              onClick={() => setOpenQ(expanded ? null : item.q)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left text-xs tracking-[var(--tk-15)] text-white/60 outline-none transition-colors duration-300 hover:text-white/90"
            >
              {item.q}
              <span className="shrink-0 text-white/30">{expanded ? '−' : '+'}</span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_SLOW }}
                  className="overflow-hidden"
                >
                  <p className="pb-3 text-xs leading-relaxed tracking-wide text-white/35">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}
