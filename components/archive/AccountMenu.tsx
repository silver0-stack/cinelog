'use client'

import { useState } from 'react'
import { SignOutButton } from '@/components/auth/SignOutButton'

// 로그인한 계정이 누구인지 화면 어디에도 안 보이고, 로그아웃도 /login에 따로
// 들어가야만 할 수 있었다 — 같은 브라우저에서 여러 계정을 오갈 때 "지금 누구로
// 로그인돼 있는지" 확인할 방법이 없었던 게 실제 혼란(다른 사람 계정으로 잘못
// 기록하는 문제)으로 이어진 적이 있다. CLAUDE.md가 만들지 않기로 한 "프로필"은
// 개인정보 편집/공개 프로필 페이지 같은 전통적인 의미고, 이건 그것과 달리
// 지금 세션이 누구인지 보여주고 로그아웃만 하는 최소한의 계정 표시다.
export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const initial = email.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="계정"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[10px] font-light text-white/50 outline-none transition-colors duration-500 hover:border-white/40 hover:text-white/80"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 flex flex-col items-end gap-3 whitespace-nowrap bg-black px-3 py-3">
          <p className="text-[10px] tracking-[0.15em] text-white/40">{email}</p>
          <SignOutButton />
        </div>
      )}
    </div>
  )
}
