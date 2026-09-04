'use client'

import Link from 'next/link'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

type Props = {
  onEnter: () => void
}

export function Entrance({ onEnter }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-16">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70 sm:text-base">
            CINELOG
          </h1>
          {/* 첫 화면에 아무 설명 없이 로고와 ENTER만 있으면 "이게 뭔지" 감이 안
              온다는 피드백이 있었다 — 절제된 톤을 지키면서 딱 한 줄로만 밝힌다. */}
          <p className="text-center text-[10px] font-light leading-relaxed tracking-[0.3em] text-white/25">
            심야, 좌석 하나에서 시작되는 영화의 우주
          </p>
        </div>
        <button
          type="button"
          onClick={onEnter}
          className="animate-pulse-slow text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 focus-visible:text-white/80"
        >
          ENTER
        </button>
      </div>

      {/* 데모 체험 어디에도 로그인으로 가는 길이 없으면 V2가 있다는 것 자체를
          아무도 모른다 — 분위기를 깨지 않는 선에서 아주 작게만 둔다. */}
      <Link href="/login" className={`absolute bottom-6 right-6 ${secondaryNavLinkClass}`}>
        LOG IN
      </Link>

      <Link href="/about" className={`absolute bottom-6 left-6 ${secondaryNavLinkClass}`}>
        ABOUT
      </Link>
    </div>
  )
}
