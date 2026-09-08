import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from '@/lib/i18n/getLocale'
import type { Locale } from '@/lib/i18n/locale'

const LAST_UPDATED = '2026-09-08'
const CONTACT_EMAIL = 'dev.choiey@gmail.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: locale === 'en' ? 'Terms of Service · CINELOG' : '이용약관 · CINELOG',
  }
}

type Section = { heading: string; body: string[] }

// 법률 자문이 아니라 무료 개인 프로젝트 수준에서 스스로를 보호하기 위한 최소한의
// 이용약관/면책조항이다 — 결제가 없어 전자상거래법상 필수 약관은 아니지만,
// 서비스 중단/데이터 손실에 대한 책임 범위를 명확히 해두려고 만들었다. TMDB API
// 이용약관이 요구하는 출처 고지 문구(4번)는 이 페이지가 실제 의무 사항이라 정확한
// 영문 문구를 그대로 싣는다 — 번역하지 않는다.
const COPY: Record<Locale, { title: string; lastUpdatedLabel: string; intro: string; sections: Section[] }> = {
  ko: {
    title: '이용약관',
    lastUpdatedLabel: `최종 수정일 ${LAST_UPDATED}`,
    intro:
      'CINELOG(이하 "서비스")는 개인이 만들고 운영하는 무료 서비스입니다. 아래는 서비스를 이용하기 전에 알아두어야 할 내용입니다.',
    sections: [
      {
        heading: '1. 서비스 소개',
        body: [
          '서비스는 무료로 제공되며, 결제나 유료 기능은 없습니다. 개인이 만들고 운영하는 프로젝트라, 회사 형태의 사업자가 아닙니다.',
        ],
      },
      {
        heading: '2. 계정과 이용',
        body: [
          '이메일 매직링크로 로그인하며, 이용자가 직접 입력한 영화 기록·메모·배치·텍스트는 이용자 본인의 콘텐츠입니다.',
          '서비스를 악용하는 행위(자동화된 대량 요청, 타인의 계정 도용, 불법적인 내용 게시 등)는 금지되며, 발견 시 사전 통지 없이 이용을 제한할 수 있습니다.',
        ],
      },
      {
        heading: '3. 서비스 변경 및 중단',
        body: [
          '서비스는 예고 없이 기능이 변경되거나 일시적으로 중단될 수 있습니다. 개인이 무료로 운영하는 프로젝트의 특성상, 서비스를 영구적으로 종료할 수도 있습니다. 종료가 결정되면 최대한 미리 알리려 노력하겠습니다.',
        ],
      },
      {
        heading: '4. 저작권 및 출처',
        body: [
          '서비스가 제공하는 영화 정보(포스터, 제목, 감독 등 메타데이터)의 일부는 TMDB(The Movie Database) API를 통해 가져옵니다.',
          'This product uses the TMDB API but is not endorsed or certified by TMDB.',
          '이용자가 직접 작성한 메모, 텍스트, 배치 등은 이용자 본인에게 저작권이 있습니다.',
        ],
      },
      {
        heading: '5. 면책조항',
        body: [
          '서비스는 "있는 그대로" 제공되며, 특정 목적에 대한 적합성이나 오류 없는 동작을 보증하지 않습니다.',
          '서버 장애, 데이터베이스 오류 등으로 기록이 손상되거나 유실될 가능성을 완전히 배제할 수 없습니다. 서비스 이용 중 발생하는 손해에 대해 법이 허용하는 범위 내에서 책임을 지지 않습니다.',
        ],
      },
      {
        heading: '6. 문의',
        body: [`이용약관 관련 문의는 ${CONTACT_EMAIL}로 보내주세요.`],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdatedLabel: `Last updated ${LAST_UPDATED}`,
    intro:
      'CINELOG ("the Service") is a free service built and run by an individual developer. Here is what you should know before using it.',
    sections: [
      {
        heading: '1. About the Service',
        body: [
          'The Service is provided free of charge, with no payments or paid features. It is an individual project, not operated by a registered company.',
        ],
      },
      {
        heading: '2. Accounts and use',
        body: [
          'You sign in with an email magic link. Movie logs, notes, layout positions, and text you enter are your own content.',
          'Abuse of the Service (automated bulk requests, impersonating another account, posting unlawful content, etc.) is prohibited, and access may be restricted without prior notice if this occurs.',
        ],
      },
      {
        heading: '3. Changes and discontinuation',
        body: [
          "Features may change or the Service may be temporarily unavailable without notice. As a free individual project, the Service may also be discontinued permanently. If that happens, reasonable effort will be made to notify users in advance.",
        ],
      },
      {
        heading: '4. Copyright and attribution',
        body: [
          'Some movie information provided by the Service (posters, titles, director metadata, etc.) is retrieved via the TMDB (The Movie Database) API.',
          'This product uses the TMDB API but is not endorsed or certified by TMDB.',
          'Notes, text, and layouts you create yourself remain your own copyright.',
        ],
      },
      {
        heading: '5. Disclaimer',
        body: [
          'The Service is provided "as is," without warranty of fitness for a particular purpose or error-free operation.',
          "The possibility of data damage or loss due to server or database issues cannot be fully ruled out. To the extent permitted by law, no liability is assumed for damages arising from use of the Service.",
        ],
      },
      {
        heading: '6. Contact',
        body: [`For questions about these Terms, email ${CONTACT_EMAIL}.`],
      },
    ],
  },
}

export default async function TermsPage() {
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
