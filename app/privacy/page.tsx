import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from '@/lib/i18n/getLocale'
import type { Locale } from '@/lib/i18n/locale'

const LAST_UPDATED = '2026-09-08'
const CONTACT_EMAIL = 'dev.choiey@gmail.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: locale === 'en' ? 'Privacy Policy · CINELOG' : '개인정보처리방침 · CINELOG',
  }
}

type Section = { heading: string; body: string[] }

// 법률 자문이 아니라 일반적인 가이드라인 수준의 문서다 — 이 서비스가 실제로
// 수집/처리하는 항목만 코드 기준으로 정확하게 적는다(과장도 누락도 없이).
// 결제/광고가 없는 무료 개인 프로젝트라 전자상거래법상 사업자 정보 고지 의무는
// 해당하지 않지만, 이메일 로그인과 이용 기록을 저장하는 이상 개인정보보호법상
// 처리방침 공개 대상이라 만들었다.
const COPY: Record<Locale, { title: string; lastUpdatedLabel: string; intro: string; sections: Section[] }> = {
  ko: {
    title: '개인정보처리방침',
    lastUpdatedLabel: `최종 수정일 ${LAST_UPDATED}`,
    intro:
      'CINELOG(이하 "서비스")는 개인이 만들고 운영하는 무료 서비스입니다. 결제나 광고는 없으며, 아래는 서비스를 이용하면서 어떤 정보가 어떻게 다뤄지는지 최대한 있는 그대로 적은 내용입니다.',
    sections: [
      {
        heading: '1. 수집하는 개인정보',
        body: [
          '이메일 주소 — 비밀번호 없는 매직링크 로그인에만 사용됩니다(Supabase Auth). 그 외 어떤 개인 식별 정보(이름, 전화번호 등)도 요구하지 않습니다.',
          '기록한 영화 정보 — 제목, 연도, 감독, 장르, 평점, 한줄메모, 관람일, 우주 안에서 직접 배치한 위치, 직접 작성한 텍스트 라벨. 모두 이용자가 직접 입력한 내용입니다.',
        ],
      },
      {
        heading: '2. 자동으로 수집되는 정보',
        body: [
          'Vercel Web Analytics — 방문 페이지, 대략적인 유입 경로(리퍼러/UTM), 로그인 요청·가입 완료·공유 클릭 같은 사용 이벤트를 쿠키 없이 집계합니다. 개인을 특정할 수 있는 형태로 저장되지 않습니다.',
          'Sentry(에러 모니터링) — 서비스에 오류가 발생하면 그 시점의 브라우저/기기 정보와 오류 스택을 자동으로 수집합니다. 이메일이나 계정 식별 정보는 오류 리포트에 함께 전송되지 않습니다.',
        ],
      },
      {
        heading: '3. 쿠키',
        body: [
          '로그인 세션을 유지하기 위한 필수 쿠키(Supabase Auth)만 사용합니다. 광고나 추적 목적의 쿠키는 사용하지 않습니다.',
        ],
      },
      {
        heading: '4. 제3자 제공',
        body: [
          'TMDB(The Movie Database) — 영화를 검색할 때 검색어가 서버를 통해 TMDB API로 전달됩니다. 이 요청에는 이용자의 계정 정보나 이메일이 포함되지 않습니다.',
          '이 외에 어떤 정보도 제3자에게 판매하거나 공유하지 않습니다.',
        ],
      },
      {
        heading: '5. 보관 기간 및 삭제',
        body: [
          '계정과 기록은 서비스를 이용하는 동안 보관됩니다. 현재 화면에서 직접 계정을 삭제하는 기능은 제공되지 않습니다 — 삭제를 원하시면 아래 이메일로 요청해 주세요. 확인 후 계정과 저장된 모든 기록을 삭제합니다.',
        ],
      },
      {
        heading: '6. 문의',
        body: [`개인정보 관련 문의나 삭제 요청은 ${CONTACT_EMAIL}로 보내주세요.`],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdatedLabel: `Last updated ${LAST_UPDATED}`,
    intro:
      'CINELOG ("the Service") is a free service built and run by an individual developer. There are no payments or ads. Below is a plain description of what information is handled and how.',
    sections: [
      {
        heading: '1. Personal information collected',
        body: [
          'Email address — used only for passwordless magic-link login (Supabase Auth). No other identifying information (name, phone number, etc.) is required.',
          'Logged movie data — title, year, director, genres, rating, note, watch date, the position you place a movie at in your universe, and any free text labels you write. All of this is content you enter yourself.',
        ],
      },
      {
        heading: '2. Information collected automatically',
        body: [
          "Vercel Web Analytics — aggregates page visits, approximate traffic sources (referrer/UTM), and usage events like login requests, signups, and share clicks, without cookies. It is not stored in a form that identifies you personally.",
          "Sentry (error monitoring) — when an error occurs, browser/device details and the error stack trace at that moment are collected automatically. Your email or account identity is not sent along with error reports.",
        ],
      },
      {
        heading: '3. Cookies',
        body: [
          'Only essential cookies required to keep you signed in (Supabase Auth) are used. No advertising or tracking cookies are used.',
        ],
      },
      {
        heading: '4. Third-party sharing',
        body: [
          "TMDB (The Movie Database) — when you search for a movie, the search term is sent to the TMDB API through our server. This request does not include your account information or email.",
          'No information is sold or shared with any other third party.',
        ],
      },
      {
        heading: '5. Retention and deletion',
        body: [
          "Your account and records are kept for as long as you use the Service. There is no in-app account deletion yet — email the address below to request deletion, and your account and all stored records will be removed after confirmation.",
        ],
      },
      {
        heading: '6. Contact',
        body: [`For privacy questions or deletion requests, email ${CONTACT_EMAIL}.`],
      },
    ],
  },
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const copy = COPY[locale]

  return (
    <main className="flex min-h-dvh w-screen flex-col items-center bg-black px-6 py-20">
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="text-[9px] font-light tracking-[var(--tk-50)] text-white/20 outline-none transition-colors duration-700 hover:text-white/50"
        >
          CINELOG
        </Link>

        <h1 className="mt-8 text-sm font-light tracking-[var(--tk-30)] text-white/70">{copy.title}</h1>
        <p className="mt-2 text-[11px] font-light tracking-[var(--tk-15)] text-white/25">{copy.lastUpdatedLabel}</p>

        <p className="mt-8 text-[13px] font-light leading-loose tracking-[var(--tk-10)] text-white/50">
          {copy.intro}
        </p>

        <div className="mt-14 flex flex-col gap-10">
          {copy.sections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-3">
              <h2 className="text-xs font-light tracking-[var(--tk-15)] text-white/60">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[13px] font-light leading-loose tracking-[var(--tk-10)] text-white/40"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
