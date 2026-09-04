'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

type Props = {
  /** 체험 트리거(하단 별)를 누르면 호출된다 — 좌석 없이 곧장 블랙홀 전환으로 이어진다. */
  onEnter: () => void
}

const headingClass = 'text-xs font-light tracking-[0.3em] text-white/70 sm:text-sm'
const bodyClass = 'text-xs font-light leading-loose tracking-[0.15em] text-white/40'

// 스크롤해서 내려가며 읽는 하나의 랜딩 페이지다. 예전엔 "좌석을 찾아서 눌러야만
// 입장할 수 있는" 영화관 장면이 첫 화면이었는데, 좌석을 못 찾으면 끝까지 입장도
// 못 하는 장애물이라는 피드백으로 이렇게 바꿨다 — 이 앱이 뭔지, 왜 만들었는지,
// 어떻게 쓰는지를 먼저 설명하고, 맨 아래에서 별 하나를 누르면 그제서야 블랙홀
// 전환(HomeRitual)으로 이어진다. 섹션마다 whileInView로 아주 천천히 떠오르게 해서
// "스크롤=탐험"이라는 감각을 유지한다 — 한 번에 다 쏟아붓지 않는다.
function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 1.6, ease: EASE_SLOW }}
      className={`flex w-full flex-col items-center px-6 text-center ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function Entrance({ onEnter }: Props) {
  return (
    <div className="flex min-h-full w-full flex-col items-center bg-black">
      {/* 스크롤해도 항상 접근 가능한 로그인 진입로 — 데모만 보고 갈 사람에게도,
          이미 계정이 있어서 바로 로그인만 하고 싶은 사람에게도 필요하다. */}
      <Link href="/login" className={`fixed right-6 top-6 z-10 ${secondaryNavLinkClass}`}>
        LOG IN
      </Link>

      {/* 히어로 */}
      <section className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-16 px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70 sm:text-base">
            CINELOG
          </h1>
          <p className="max-w-xs text-center text-[10px] font-light leading-relaxed tracking-[0.3em] text-white/25">
            영화와 영화 사이, 당신만의 우주
          </p>
          <p className="max-w-xs text-center text-[11px] font-light leading-loose tracking-[0.15em] text-white/40">
            영화 한 편이 하나의 우주가 된다.
            <br />
            감독과 장르와 정서로 이어진 영화들이,
            <br />
            서로를 당기며 우주를 이룬다.
          </p>
        </div>

        <div className="flex items-center gap-10">
          <Link
            href="/login"
            className="text-xs font-light tracking-[0.5em] text-white/60 outline-none transition-colors duration-700 hover:text-white/90 focus-visible:text-white/90"
          >
            내 우주 만들기
          </Link>
          <a
            href="#how"
            className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70 focus-visible:text-white/70"
          >
            이용 방법
          </a>
        </div>

        <p className="animate-pulse-slow absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-light tracking-[0.4em] text-white/20">
          SCROLL
        </p>
      </section>

      {/* 이용 방법 */}
      <Section id="how" className="max-w-sm gap-14 py-28">
        <h2 className={headingClass}>어떻게 쓰나요</h2>
        <div className="grid w-full grid-cols-1 gap-10 sm:grid-cols-2">
          {[
            { n: '01', t: '기록한다', d: '영화를 보고 평점과 메모를 남겨.' },
            { n: '02', t: '우주가 된다', d: '감독, 장르, 정서로 이어진 영화들이 서로 가까워져.' },
            { n: '03', t: '탐색한다', d: '확대하고 중심을 옮기며 관계를 따라가.' },
            { n: '04', t: '공유한다', d: '우주 전체나 영화 한 편을 링크로 보여줘.' },
          ].map((step) => (
            <div key={step.n} className="flex flex-col items-center gap-2">
              <p className="text-[10px] tracking-[0.3em] text-white/20">{step.n}</p>
              <p className="text-sm font-light tracking-[0.15em] text-white/70">{step.t}</p>
              <p className={bodyClass}>{step.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 철학 */}
      <Section className="max-w-xs gap-6 py-28">
        <p className="text-[13px] font-light leading-loose tracking-[0.1em] text-white/60">
          영화를 볼수록 내 우주가 넓어진다.
          <br />
          나를 채운 영화들이 모여,
          <br />
          광활하고 끝없는 하나의 세계가 된다.
        </p>
      </Section>

      {/* 체험 — 예전 좌석 대신, 별 하나가 블랙홀 전환의 매개가 된다 */}
      <section className="flex min-h-dvh w-full flex-col items-center justify-center gap-10 px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h2 className={headingClass}>지금 둘러보기</h2>
          <p className={bodyClass}>24편으로 채운 데모 우주를 로그인 없이 체험할 수 있어.</p>
        </div>

        <button
          type="button"
          onClick={onEnter}
          aria-label="데모 우주로 들어가기"
          className="group flex flex-col items-center gap-4 outline-none"
        >
          <span
            className="h-3 w-3 rounded-full transition-transform duration-700 group-hover:scale-125"
            style={{
              background: 'radial-gradient(circle, rgba(255,226,190,0.95), rgba(255,226,190,0.15) 70%)',
              boxShadow: '0 0 40px 10px rgba(255,214,150,0.18)',
            }}
          />
          <span className="text-[10px] font-light tracking-[0.4em] text-white/30 transition-colors duration-700 group-hover:text-white/70">
            눌러서 들어가기
          </span>
        </button>
      </section>

      {/* FAQ */}
      <Section className="max-w-sm gap-10 py-28">
        <h2 className={headingClass}>자주 묻는 질문</h2>
        <div className="flex w-full flex-col gap-8">
          {[
            { q: '로그인 안 해도 볼 수 있어?', a: '응. 데모 우주는 누구나 로그인 없이 둘러볼 수 있어. 내가 본 영화로 채운 진짜 우주를 가지려면 로그인이 필요해.' },
            { q: '무료야?', a: '응, 완전히 무료야.' },
            { q: '내 정보가 다른 사람에게 보여?', a: '아니. 네가 직접 공유 링크를 켜지 않는 한 아무도 못 봐.' },
          ].map((item) => (
            <div key={item.q} className="flex flex-col items-center gap-2">
              <p className="text-[11px] tracking-[0.1em] text-white/60">{item.q}</p>
              <p className={bodyClass}>{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 마지막 CTA */}
      <Section className="min-h-dvh justify-center gap-10">
        <p className="max-w-xs text-[13px] font-light leading-loose tracking-[0.1em] text-white/60">
          지금 당신의 우주를 시작해보세요.
        </p>
        <Link
          href="/login"
          className="animate-pulse-slow text-xs font-light tracking-[0.5em] text-white/50 outline-none transition-colors duration-700 hover:text-white/85 focus-visible:text-white/85"
        >
          내 우주 만들기
        </Link>
      </Section>

      <footer className="flex w-full flex-col items-center gap-4 px-6 py-16">
        <p className="text-[9px] font-light tracking-[0.5em] text-white/20">CINELOG</p>
      </footer>
    </div>
  )
}
