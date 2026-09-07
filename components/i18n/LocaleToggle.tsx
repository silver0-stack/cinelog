'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { navLinkClass } from '@/lib/uiStyles'
import { FlagKR } from '@/components/icons/FlagKR'
import { FlagUS } from '@/components/icons/FlagUS'
import type { Locale } from '@/lib/i18n/locale'

type Props = { className?: string }

// 유튜브 댓글 언어 표시처럼 국기를 코드 옆에 붙인다. 이모지(🇰🇷/🇺🇸)로
// 했더니 윈도우는 국기 이모지 자체를 지원 안 해서 "KR"/"US" 글자로만
// 보였다(마이크로소프트가 의도적으로 뺀 것 — 플랫폼 한계, 앱 버그 아님) —
// 그래서 직접 그린 SVG로 바꿨다. 버튼은 항상 "누르면 바뀔 언어"를 보여주므로
// (지금 한국어면 EN), 국기도 그 대상 언어 기준으로 맞춘다.
const FLAG: Record<Locale, (props: { size?: number }) => ReactNode> = { ko: FlagKR, en: FlagUS }
const otherLocale = (locale: Locale): Locale => (locale === 'ko' ? 'en' : 'ko')

// URL은 안 바꾼다(/m, /u가 이미 뿌려진 공유 링크라서) — 쿠키만 바꾸고
// router.refresh()로 서버 컴포넌트도 같은 요청 안에서 새 언어로 다시 그리게 한다.
export function LocaleToggle({ className }: Props) {
  const { locale, setLocale, t } = useLocale()
  const router = useRouter()
  const Flag = FLAG[otherLocale(locale)]

  return (
    <button
      type="button"
      onClick={() => {
        setLocale(otherLocale(locale))
        router.refresh()
      }}
      className={`flex items-center gap-1.5 ${className ?? navLinkClass}`}
      aria-label="language"
    >
      <Flag />
      {t('locale.toggleTo')}
    </button>
  )
}

// 계정 메뉴(AccountMenu) 안의 menuActions 항목으로 언어 토글을 넣을 때 쓴다 —
// 로그인한 화면은 상시 노출 버튼 대신 "가이드"처럼 계정 메뉴 안에 넣는다(항상
// 밖에 떠 있을 필요는 없다는 판단). 로그인 전 화면(데모/공유 우주, 계정 메뉴
// 자체가 없는 곳)은 여전히 LocaleToggle을 상시 버튼으로 그대로 쓴다.
export function useLocaleMenuAction(): { label: ReactNode; onClick: () => void } {
  const { locale, setLocale, t } = useLocale()
  const router = useRouter()
  const Flag = FLAG[otherLocale(locale)]
  return {
    label: (
      <>
        <Flag />
        {t('locale.toggleTo')}
      </>
    ),
    onClick: () => {
      setLocale(otherLocale(locale))
      router.refresh()
    },
  }
}
