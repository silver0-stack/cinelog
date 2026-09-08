'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass, navLinkClass, primaryNavLinkClass } from '@/lib/uiStyles'
import { AccountMenu } from '@/components/archive/AccountMenu'
import { useLocale } from '@/components/i18n/LocaleProvider'
import { LocaleToggle, useLocaleMenuAction } from '@/components/i18n/LocaleToggle'
import type { Locale } from '@/lib/i18n/locale'

type Step = { n: string; t: string; d: string }
type FaqItem = { q: string; a: string }

// 이 페이지에서만 쓰는 긴 카피라 중앙 사전(lib/i18n/dictionary.ts) 대신 여기
// 옆에 둔다 — 짧고 여러 곳에서 재사용되는 문구만 사전으로 뺀다는 원칙(계획 문서 참고).
const ENTRANCE_COPY: Record<
  Locale,
  {
    tagline: string
    descriptionLines: string[]
    howToTitle: string
    steps: Step[]
    philosophyLines: string[]
    tryTitle: string
    trySubtitle: string
    enterAriaLabel: string
    pressToEnterLabel: string
    faqTitle: string
    faq: FaqItem[]
    finalCtaSentence: string
    browseDemoLabel: string
  }
> = {
  ko: {
    tagline: '영화와 영화 사이, 당신만의 우주',
    descriptionLines: ['영화 한 편이 하나의 우주가 된다.', '감독과 장르와 정서로 이어진 영화들이,', '서로를 당기며 우주를 이룬다.'],
    howToTitle: '어떻게 쓰나요',
    steps: [
      { n: '01', t: '기록한다', d: '영화를 보고 평점과 메모를 남겨.' },
      { n: '02', t: '우주가 된다', d: '감독, 장르, 정서로 이어진 영화들이 서로 가까워져.' },
      { n: '03', t: '탐색한다', d: '확대하고 영화를 눌러 관계를 발견해.' },
      { n: '04', t: '공유한다', d: '우주 전체나 영화 한 편을 링크로 보여줘.' },
    ],
    philosophyLines: ['영화를 볼수록 내 우주가 넓어진다.', '나를 채운 영화들이 모여,', '광활하고 끝없는 하나의 세계가 된다.'],
    tryTitle: '지금 둘러보기',
    trySubtitle: '80편으로 채운 데모 우주를 로그인 없이 체험할 수 있어.',
    enterAriaLabel: '데모 우주로 들어가기',
    pressToEnterLabel: '눌러서 들어가기',
    faqTitle: '자주 묻는 질문',
    faq: [
      { q: '로그인 안 해도 볼 수 있어?', a: '응. 데모 우주는 누구나 로그인 없이 둘러볼 수 있어. 내가 본 영화로 채운 진짜 우주를 가지려면 로그인이 필요해.' },
      { q: '무료야?', a: '응, 완전히 무료야.' },
      { q: '내 정보가 다른 사람에게 보여?', a: '아니. 네가 직접 공유 링크를 켜지 않는 한 아무도 못 봐.' },
    ],
    finalCtaSentence: '지금 네 우주를 시작해봐.',
    browseDemoLabel: '데모 우주 둘러보기',
  },
  en: {
    tagline: 'A universe between movies, all your own',
    descriptionLines: [
      'Every film becomes a universe.',
      'Movies linked by director, genre, and mood',
      'pull toward each other to form one.',
    ],
    howToTitle: 'How it works',
    steps: [
      { n: '01', t: 'Log', d: 'Rate it and jot a note after you watch.' },
      { n: '02', t: 'It becomes a universe', d: 'Movies linked by director, genre, and mood drift closer together.' },
      { n: '03', t: 'Explore', d: 'Zoom in and open a movie to discover its connections.' },
      { n: '04', t: 'Share', d: 'Send a link to your whole universe, or just one movie.' },
    ],
    philosophyLines: [
      'The more you watch, the wider your universe grows.',
      'The films that shaped you gather together',
      'into one vast, endless world.',
    ],
    tryTitle: 'Try it now',
    trySubtitle: 'Explore a demo universe of 80 films, no login needed.',
    enterAriaLabel: 'Enter the demo universe',
    pressToEnterLabel: 'Press to enter',
    faqTitle: 'Frequently asked',
    faq: [
      {
        q: 'Can I look around without logging in?',
        a: "Yes. Anyone can browse the demo universe without logging in. To grow a real universe from movies you've actually watched, you'll need to log in.",
      },
      { q: 'Is it free?', a: 'Yes, completely free.' },
      { q: 'Can other people see my data?', a: "No. No one can see it unless you turn on a share link yourself." },
    ],
    finalCtaSentence: 'Start your universe now.',
    browseDemoLabel: 'Browse the demo universe',
  },
}

type Props = {
  /** 체험 트리거(하단 별)를 누르면 호출된다 — 좌석 없이 곧장 블랙홀 전환으로 이어진다. */
  onEnter: () => void
  /** 로그인한 유저의 이메일. 로그인 안 했으면 null — 이 페이지는 로그인 여부와
   * 무관하게 항상 보이니(더 이상 /archive로 강제 리다이렉트하지 않는다), CTA와
   * 우측 상단 링크가 로그인 여부에 따라 달라져야 한다. */
  userEmail: string | null
}

const headingClass = 'text-sm font-light tracking-[var(--tk-30)] text-white/70 sm:text-base'
const bodyClass = 'text-[13px] font-light leading-loose tracking-[var(--tk-15)] text-white/40 sm:text-sm'

// 스크롤해서 내려가며 읽는 하나의 랜딩 페이지다. 예전엔 "좌석을 찾아서 눌러야만
// 입장할 수 있는" 영화관 장면이 첫 화면이었는데, 좌석을 못 찾으면 끝까지 입장도
// 못 하는 장애물이라는 피드백으로 이렇게 바꿨다 — 이 앱이 뭔지, 왜 만들었는지,
// 어떻게 쓰는지를 먼저 설명하고, 맨 아래에서 별 하나를 누르면 그제서야 블랙홀
// 전환(HomeRitual)으로 이어진다. 섹션마다 whileInView로 아주 천천히 떠오르게 해서
// "스크롤=탐험"이라는 감각을 유지한다 — 한 번에 다 쏟아붓지 않는다.
function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  // 동작 줄이기를 켠 사용자에게는 아래에서 위로 올라오는 이동(y) 없이 밝기만
  // 바꾼다 — 스크롤할 때마다 화면 여기저기가 계속 움직이는 건 그 자체로
  // 피로/어지러움을 유발할 수 있는 종류다.
  const reducedMotion = useReducedMotion()
  const offset = reducedMotion ? 0 : 16

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 1.6, ease: EASE_SLOW }}
      className={`flex w-full flex-col items-center px-6 text-center ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function Entrance({ onEnter, userEmail }: Props) {
  const { locale, t } = useLocale()
  const localeMenuAction = useLocaleMenuAction()
  const copy = ENTRANCE_COPY[locale]
  const primaryCtaLabel = userEmail ? t('nav.goToMyUniverse') : t('nav.createMyUniverse')
  const primaryCtaHref = userEmail ? '/archive' : '/login'

  return (
    <div className="flex min-h-full w-full flex-col items-center bg-black">
      {/* 스크롤해도 항상 접근 가능한 진입로 — 로그인 안 했으면 로그인으로, 이미
          로그인했으면 계정 메뉴(내 우주 가기/로그아웃)로 바뀐다. 언어 토글은
          계정 메뉴가 있으면(로그인 상태) 그 안으로 들어가고, 없으면(로그인 전)
          상시 버튼으로 남는다 — 항상 밖에 떠 있을 필요는 없다는 판단. */}
      <div className="fixed right-6 top-6 z-10 flex items-center gap-2">
        {userEmail ? (
          <AccountMenu
            email={userEmail}
            links={[{ label: t('nav.goToMyUniverse'), href: '/archive' }]}
            menuActions={[localeMenuAction]}
          />
        ) : (
          <>
            <LocaleToggle className={secondaryNavLinkClass} />
            <Link href="/login" className={secondaryNavLinkClass}>
              LOG IN
            </Link>
          </>
        )}
      </div>

      {/* 히어로 */}
      <section className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-16 px-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70 sm:text-base">
            CINELOG
          </h1>
          <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-[var(--tk-30)] text-white/25">
            {copy.tagline}
          </p>
          <p className="max-w-xs text-center text-[13px] font-light leading-loose tracking-[var(--tk-15)] text-white/40 sm:text-sm">
            {copy.descriptionLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* 데모 진입을 첫 화면에서 바로 보이게 한다 — 예전엔 여기 없이 "이용 방법"
            (아래 섹션으로 스크롤)만 있어서, 로그인/데모 중 뭘 골라야 할지도 모른 채
            둘 다 같은 무게로 보이는 링크였다. 처음 온 사람은 "내 우주 만들기"가
            메인 액션처럼 읽혀서 그걸 누르고, 그 아래 데모 우주가 있다는 건 끝까지
            모르고 지나갔다. 로그인을 강제하지 않는다는 방향에 맞춰 데모를
            시각적으로 더 우선하는 쪽으로 둔다. */}
        {/* (2026-09-08) 이전엔 이 둘도 순수 텍스트라 처음 보는 사람에게 "눌러야
            하는 버튼"이라는 형태 신호가 없었다 — 이미 검증된 pill 버튼 스타일
            (navLinkClass/primaryNavLinkClass, 2026-09-06 실사용자 테스트에서
            나온 결론)을 그대로 재사용한다. 위계(진짜 전환 액션 vs 데모 체험)는
            새로 만들지 않고 기존 밝기 위계를 채움 유무로 옮겼을 뿐이다. */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-12">
          <button type="button" onClick={onEnter} className={userEmail ? navLinkClass : primaryNavLinkClass}>
            {copy.browseDemoLabel}
          </button>
          <Link href={primaryCtaHref} className={userEmail ? primaryNavLinkClass : navLinkClass}>
            {primaryCtaLabel}
          </Link>
        </div>

        <p className="animate-pulse-slow absolute bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-light tracking-[0.4em] text-white/20">
          SCROLL
        </p>
      </section>

      {/* 이용 방법 */}
      <Section id="how" className="max-w-sm gap-14 py-28">
        <h2 className={headingClass}>{copy.howToTitle}</h2>
        <div className="grid w-full grid-cols-1 gap-10 sm:grid-cols-2">
          {copy.steps.map((step) => (
            <div key={step.n} className="flex flex-col items-center gap-2">
              <p className="text-[10px] tracking-[0.3em] text-white/20">{step.n}</p>
              <p className="text-sm font-light tracking-[var(--tk-15)] text-white/70">{step.t}</p>
              <p className={bodyClass}>{step.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 철학 */}
      <Section className="max-w-xs gap-6 py-28">
        <p className="text-[13px] font-light leading-loose tracking-[var(--tk-10)] text-white/60">
          {copy.philosophyLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      </Section>

      {/* 체험 — 예전 좌석 대신, 별 하나가 블랙홀 전환의 매개가 된다 */}
      <section className="flex min-h-dvh w-full flex-col items-center justify-center gap-10 px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h2 className={headingClass}>{copy.tryTitle}</h2>
          <p className={bodyClass}>{copy.trySubtitle}</p>
        </div>

        <button
          type="button"
          onClick={onEnter}
          aria-label={copy.enterAriaLabel}
          className="group flex flex-col items-center gap-4 outline-none"
        >
          <span
            className="h-3 w-3 rounded-full transition-transform duration-700 group-hover:scale-125"
            style={{
              background: 'radial-gradient(circle, rgba(255,226,190,0.95), rgba(255,226,190,0.15) 70%)',
              boxShadow: '0 0 40px 10px rgba(255,214,150,0.18)',
            }}
          />
          <span className="text-xs font-light tracking-[var(--tk-40)] text-white/50 transition-colors duration-700 group-hover:text-white/80">
            {copy.pressToEnterLabel}
          </span>
        </button>
      </section>

      {/* FAQ */}
      <Section className="max-w-sm gap-10 py-28">
        <h2 className={headingClass}>{copy.faqTitle}</h2>
        <div className="flex w-full flex-col gap-8">
          {copy.faq.map((item) => (
            <div key={item.q} className="flex flex-col items-center gap-2">
              <p className="text-sm tracking-[var(--tk-10)] text-white/60">{item.q}</p>
              <p className={bodyClass}>{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 마지막 CTA */}
      <Section className="min-h-dvh justify-center gap-10">
        <p className="max-w-xs text-[13px] font-light leading-loose tracking-[var(--tk-10)] text-white/60">
          {copy.finalCtaSentence}
        </p>
        {/* 채워진 pill 자체가 이미 화면에서 가장 눈에 띄는 요소라 pulse로 더
            끌 필요가 없다 — pulse는 옅은 텍스트 링크였을 때 시선을 끌던 장치였다. */}
        <Link href={primaryCtaHref} className={primaryNavLinkClass}>
          {primaryCtaLabel}
        </Link>
      </Section>

      <footer className="flex w-full flex-col items-center gap-4 px-6 py-16">
        {/* "시네로그"(한글 표기)가 화면 어딘가에는 실제로 보여야 검색엔진이
            title/설명뿐 아니라 페이지 본문에서도 그 연관성을 확인할 수 있다 —
            히어로의 절제된 워드마크는 그대로 두고, 이미 옅게 처리된 푸터에만
            눈에 안 띄게 얹는다. */}
        <p className="text-[9px] font-light tracking-[0.5em] text-white/20">CINELOG · 시네로그</p>
      </footer>
    </div>
  )
}
