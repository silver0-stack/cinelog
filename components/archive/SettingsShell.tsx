'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import { HelpIcon } from '@/components/icons/HelpIcon'
import { GlobeIcon } from '@/components/icons/GlobeIcon'
import { SignOutIcon } from '@/components/icons/SignOutIcon'
import { signOut } from '@/app/login/actions'
import { EASE_SLOW } from '@/lib/motion'
import { useLocaleMenuAction } from '@/components/i18n/LocaleToggle'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { UNIVERSE_QA, ARCHIVE_QA } from '@/lib/guideContent'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

// 문의는 실시간 채팅/DM이 아니라 메일 클라이언트로 넘기는 mailto 링크다 —
// CLAUDE.md가 만들지 않기로 한 채팅/DM/댓글과 다르다(2026-09-08).
const CONTACT_EMAIL = 'dev.choiey@gmail.com'

const rowClass =
  'flex w-full items-center justify-between gap-3 border-b border-white/10 py-4 text-left text-sm font-light tracking-[var(--tk-15)] text-white/70 outline-none transition-colors duration-300 hover:text-white/95'

// 계정 아이콘 → 드롭다운의 "설정" → 이 화면. 문의하기/언어/로그아웃을 같은
// 레벨의 메뉴 항목으로 나란히 둔다(2026-09-08, 사용자 피드백 — 처음엔 문의하기
// 안에 언어/로그아웃까지 다 욱여넣었더니 위계가 안 읽혔다). "문의하기"만 누르면
// 그 자리에서 펼쳐져(접고 펴는 형식 유지) FAQ 아코디언 + 이메일 문의 버튼을
// 보여주고, 언어/로그아웃은 누르는 즉시 실행되는 단순 액션이다.
//
// (2026-09-08) 원래 별도 라우트(/archive/settings)였다 — /archive가 매번
// Supabase에서 새로 불러오는 force-dynamic 페이지라, 설정에서 뒤로 돌아올
// 때마다(router.back()을 써도) 우주 전체가 다시 로드되는 느낌이었다. "+ 기록"
// 모달과 같은 이유로 ArchiveShell 위에 뜨는 오버레이로 옮겼다 — 우주 자체를
// 벗어나지 않으니 닫을 때 다시 불러올 것도 없다. onClose를 라우팅 대신 받는다.
export function SettingsShell({ email, onClose }: { email: string; onClose: () => void }) {
  const { locale, t } = useLocale()
  const [contactOpen, setContactOpen] = useState(false)
  const localeAction = useLocaleMenuAction()
  const items = [...UNIVERSE_QA[locale], ...ARCHIVE_QA[locale]]

  return (
    <main className="themed-scroll relative min-h-dvh w-screen overflow-y-auto bg-black px-6 py-16">
      <button type="button" onClick={onClose} className={`absolute left-6 top-6 ${secondaryNavLinkClass}`}>
        {t('nav.back')}
      </button>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-10 pt-10">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-center text-sm font-light tracking-[var(--tk-55)] text-white/70">{t('nav.settings')}</h1>
          <p className="text-[10px] tracking-[0.15em] text-white/30">{email}</p>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-white/10">
            <button type="button" onClick={() => setContactOpen((v) => !v)} className={rowClass}>
              <span className="flex items-center gap-2.5">
                <HelpIcon />
                {t('settings.contact')}
              </span>
              <span className="shrink-0 text-white/30">{contactOpen ? '−' : '+'}</span>
            </button>
            <AnimatePresence initial={false}>
              {contactOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_SLOW }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 pb-6 pt-6">
                    <p className="text-xs font-light tracking-widest text-white/40">{t('settings.faqIntro')}</p>
                    <FaqAccordion items={items} />
                    <a href={`mailto:${CONTACT_EMAIL}`} className={`mt-2 self-start ${secondaryNavLinkClass}`}>
                      {t('settings.contactCta')}
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button type="button" onClick={localeAction.onClick} className={rowClass}>
            <span className="flex items-center gap-2.5">
              <GlobeIcon />
              {t('nav.language')}
            </span>
            <span className="flex items-center gap-1.5 text-white/40">{localeAction.label}</span>
          </button>

          <button type="button" onClick={() => signOut()} className={`${rowClass} border-none`}>
            <span className="flex items-center gap-2.5">
              <SignOutIcon />
              {t('nav.signOut')}
            </span>
          </button>
        </div>
      </div>
    </main>
  )
}
