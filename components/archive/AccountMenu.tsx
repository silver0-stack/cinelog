'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { useClickOutside } from '@/lib/useClickOutside'

type Props = {
  email: string
  /** 계정 메뉴에 이메일/로그아웃 말고 추가로 넣을 링크 — 랜딩 페이지에서는
   * "내 우주 가기"(/archive)가 여기 들어간다. /archive 안에서는 이미 그 화면에
   * 있으니 비워둔다. */
  links?: { label: string; href: string }[]
  /** 페이지 이동이 아니라 이 자리에서 뭔가를 토글/실행하는 액션 — "가이드",
   * "패턴" 같은 부가 기능을 여기 몰아둔다. 예전엔 화면 구석에 항상 떠 있는
   * 버튼이었는데, 자주 안 쓰는 기능이 마치 주요 기능처럼 보인다는 피드백으로
   * 여기로 옮겼다. 누르면 그 자체 동작 후 메뉴를 닫는다. */
  menuActions?: { label: string; onClick: () => void }[]
}

// 로그인한 계정이 누구인지 화면 어디에도 안 보이고, 로그아웃도 /login에 따로
// 들어가야만 할 수 있었다 — 같은 브라우저에서 여러 계정을 오갈 때 "지금 누구로
// 로그인돼 있는지" 확인할 방법이 없었던 게 실제 혼란(다른 사람 계정으로 잘못
// 기록하는 문제)으로 이어진 적이 있다. CLAUDE.md가 만들지 않기로 한 "프로필"은
// 개인정보 편집/공개 프로필 페이지 같은 전통적인 의미고, 이건 그것과 달리
// 지금 세션이 누구인지 보여주고 로그아웃만 하는 최소한의 계정 표시다.
export function AccountMenu({ email, links = [], menuActions = [] }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, open, () => setOpen(false))
  const initial = email.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={containerRef} className="relative">
      {/* 화면 위쪽을 지나가는 밝은 포스터·글로우 위에서도 테두리/글자가 보여야
          한다는 피드백 — <button>은 부모의 text-shadow를 자동으로 물려받지
          않는(폼 컨트롤이라 그런) 브라우저 기본 동작이 있어서 버튼 자신에
          직접 건다(MovieUniverse의 idle 힌트와 같은 값). 원형 테두리는
          text-shadow의 영향을 안 받는 실제 테두리선이라, drop-shadow로
          따로 어둡게 깔아 같이 보호한다. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="계정"
        className="group -m-2.5 flex items-center justify-center p-2.5 outline-none"
        style={{
          textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
          filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))',
        }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[10px] font-light text-white/50 transition-colors duration-500 group-hover:border-white/40 group-hover:text-white/80">
          {initial}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 flex flex-col items-end gap-3 whitespace-nowrap border border-white/10 bg-black px-3 py-3">
          <p className="text-[10px] tracking-[0.15em] text-white/40">{email}</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 focus-visible:text-white/80"
            >
              {link.label}
            </Link>
          ))}
          {menuActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick()
                setOpen(false)
              }}
              className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 focus-visible:text-white/80"
            >
              {action.label}
            </button>
          ))}
          <SignOutButton />
        </div>
      )}
    </div>
  )
}
