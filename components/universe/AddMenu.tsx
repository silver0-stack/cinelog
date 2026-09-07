'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { useClickOutside } from '@/lib/useClickOutside'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { navLinkClass, secondaryNavLinkClass } from '@/lib/uiStyles'

type Props = {
  onAddMovie: () => void
  onAddText: () => void
  /** "영화 추가"(데모, 저장 안 됨)와 "영화 기록"(아카이브, 평점·메모까지 남기는
   * 진짜 기록)은 같은 자리지만 실제로 하는 일이 달라 라벨을 다르게 둘 수 있게
   * 한다 — 기본값은 데모 쪽 문구다. */
  movieLabel?: string
}

// "+ 기록"(영화)과 "+ 텍스트"는 둘 다 "이 우주에 뭔가 놓아본다"는 같은 성격의
// 행동인데 예전엔 서로 다른 자리(하단 우측 / 상단 우측, 혹은 나란히 있어도
// 성격이 다른 버튼들 사이에 섞여)에 따로 떠 있었다 — 하나의 + 메뉴로 합친다
// (2026-09-08). 데모 우주에서 먼저 검증한 패턴을 로그인한 내 우주(ArchiveShell)
// 에도 그대로 재사용한다. AccountMenu와 같은 드롭다운 문법(테두리+검정 채움,
// click outside로 닫힘)을 재사용해 이 앱 안에서 낯설지 않게 한다.
export function AddMenu({ onAddMovie, onAddText, movieLabel }: Props) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, open, () => setOpen(false))

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t('addMenu.label')} className={navLinkClass}>
        +
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SLOW }}
            className="absolute right-0 top-9 z-20 flex flex-col items-end gap-3 whitespace-nowrap rounded-lg border border-white/10 bg-black px-3 py-3"
          >
            <button
              type="button"
              onClick={() => {
                onAddMovie()
                setOpen(false)
              }}
              className={secondaryNavLinkClass}
            >
              {movieLabel ?? t('addMenu.movie')}
            </button>
            <button
              type="button"
              onClick={() => {
                onAddText()
                setOpen(false)
              }}
              className={secondaryNavLinkClass}
            >
              {t('addMenu.text')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
