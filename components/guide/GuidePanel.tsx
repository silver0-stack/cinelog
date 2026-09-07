'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'
import { HelpIcon } from '@/components/icons/HelpIcon'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { useLocaleMenuAction } from '@/components/i18n/LocaleToggle'
import { UNIVERSE_QA, DEMO_QA, SHARED_QA, type QA } from '@/lib/guideContent'
import type { Locale } from '@/lib/i18n/locale'

type Props = {
  /** 'demo'면 비로그인 데모 우주용, 'shared'면 남의 공유 링크로 들어온 읽기
   * 전용 화면용 질문을 더한다. 로그인한 개인 아카이브(archive)는 이 팝업
   * 대신 전용 설정 페이지(/archive/settings)에 같은 FAQ를 그대로 보여준다
   * (2026-09-08, lib/guideContent.ts의 ARCHIVE_QA 참고). */
  variant: 'demo' | 'shared'
  /** 트리거 버튼 위치. 자체 트리거를 그릴 때만 쓴다(controlled 모드에서는 생략). */
  triggerClassName?: string
  /** 지정하면 controlled 모드 — 자체 트리거 버튼을 그리지 않고, 외부에서 열고 닫는다. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** true면 패널 하단에 언어 토글을 같이 넣는다 — 데모 우주 전용. 로그인한
   * 화면은 이미 계정 메뉴 안에 언어 토글이 있어 중복이라 기본값 false다
   * ("성격이 다른 버튼을 억지로 묶지 않는다"는 원칙 대신, 가이드와 언어 둘 다
   * "자주 안 쓰는 사이트 메타 설정"이라는 같은 성격이라 여기 묶는다, 2026-09-08). */
  showLocaleToggle?: boolean
}

const EXTRA_QA: Record<Props['variant'], Record<Locale, QA[]>> = {
  demo: DEMO_QA,
  shared: SHARED_QA,
}

// 질문이 여러 개고 문장도 길어서, 화면 구석 작은 박스에 넣고 내부 스크롤로
// 읽게 하면(특히 모바일에서) 답답하다 — 영화 카드 peek이 겪었던 것과 같은
// 문제라 같은 해법을 쓴다: 화면 중앙에 크게 띄우고, 배경을 누르면 닫힌다.
//
// (2026-09-06) 답까지 전부 펼쳐서 보여주던 걸 아코디언(누른 질문만 펼쳐짐)으로
// 바꿨다 — todomate의 "자주 묻는 질문" 화면을 참고했다: 질문 목록만 먼저 훑고,
// 궁금한 것만 펼쳐보는 쪽이 한 번에 다 읽는 것보다 덜 부담스럽다.
export function GuidePanel({ variant, triggerClassName, open: openProp, onOpenChange, showLocaleToggle = false }: Props) {
  const { locale, t } = useLocale()
  const controlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlled ? openProp : internalOpen
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setInternalOpen(v))
  const items = [...UNIVERSE_QA[locale], ...EXTRA_QA[variant][locale]]
  const localeAction = useLocaleMenuAction()

  return (
    <>
      {!controlled && triggerClassName && (
        <button type="button" onClick={() => setOpen(!open)} className={`flex items-center gap-1 ${triggerClassName}`}>
          <HelpIcon />
          {t('nav.guide')}
        </button>
      )}
      {/* z-index 숫자를 아무리 올려도 archive에서는 이 컴포넌트가 top bar의
          z-40짜리 위치 지정 div 안에 중첩돼 있어서, 그 부모의 스택 컨텍스트
          안에 갇혀 바깥(별들)과 직접 비교가 안 된다 — 밝은 중심 포스터가 패널을
          뚫고 올라와 보이던 버그의 진짜 원인이었다(열람 패널 하단 시트가 겪었던
          것과 같은 문제). document.body로 포탈해서 그 상위 스택 컨텍스트를
          아예 벗어나야 확실히 해결된다. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_SLOW }}
                className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-6"
                onClick={() => setOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="themed-scroll max-h-[85vh] w-[min(90vw,420px)] overflow-y-auto rounded-lg border border-white/10 bg-black px-5 py-5"
                >
                  <FaqAccordion items={items} />
                  <div className="mt-6 flex items-center gap-6">
                    {showLocaleToggle && (
                      <button
                        type="button"
                        onClick={localeAction.onClick}
                        className={`flex items-center gap-1.5 ${secondaryNavLinkClass}`}
                      >
                        {localeAction.label}
                      </button>
                    )}
                    <button type="button" onClick={() => setOpen(false)} className={secondaryNavLinkClass}>
                      {t('nav.close')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
