import type { Metadata } from 'next'
import Link from 'next/link'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

export const metadata: Metadata = {
  title: 'CINELOG',
}

// Next.js 기본 404는 흰 배경 페이지라 이 사이트 톤과 완전히 어긋난다 — 존재하지
// 않는 링크로 들어와도 여전히 같은 어둠 속에 있는 것처럼 느껴져야 한다.
export default function NotFound() {
  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
      <p className="text-xs font-light tracking-widest text-white/40">이 자리엔 아무것도 없어.</p>
      <Link href="/" className={secondaryNavLinkClass}>
        CINELOG
      </Link>
    </main>
  )
}
