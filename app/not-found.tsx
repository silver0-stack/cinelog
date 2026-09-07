import type { Metadata } from 'next'
import Link from 'next/link'
import { secondaryNavLinkClass } from '@/lib/uiStyles'
import { getLocale } from '@/lib/i18n/getLocale'
import { t } from '@/lib/i18n/dictionary'

export const metadata: Metadata = {
  title: 'CINELOG',
}

// Next.js 기본 404는 흰 배경 페이지라 이 사이트 톤과 완전히 어긋난다 — 존재하지
// 않는 링크로 들어와도 여전히 같은 어둠 속에 있는 것처럼 느껴져야 한다.
export default async function NotFound() {
  const locale = await getLocale()
  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
      <p className="text-xs font-light tracking-widest text-white/40">{t(locale, 'notFound.generic')}</p>
      <Link href="/" className={secondaryNavLinkClass}>
        CINELOG
      </Link>
    </main>
  )
}
