import type { Metadata } from 'next'
import Link from 'next/link'
import { getCachedCardMovie } from './_data'
import { MovieShareCard } from '@/components/movie/MovieShareCard'
import { secondaryNavLinkClass as loginLinkClass } from '@/lib/uiStyles'

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const movie = await getCachedCardMovie(slug)

  if (!movie) return { title: 'CINELOG' }

  const description = [ratingLine(movie.rating), `${movie.year} · ${movie.director}`].filter(Boolean).join(' · ')

  return {
    title: `${movie.title} · CINELOG`,
    description,
    openGraph: { title: movie.title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: movie.title, description },
  }
}

// 영화 카드 한 장의 공개 페이지(트위터 링크 붙여넣기 대상). 우주 전체가 아니라
// 이 영화 한 편과 감상 이력만 보여준다 — opengraph-image.tsx가 같은 데이터로
// 미리보기 이미지를 그려준다.
export default async function MovieCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const movie = await getCachedCardMovie(slug)

  if (!movie) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
        <p className="text-xs font-light tracking-widest text-white/40">링크를 찾을 수 없어.</p>
        <Link href="/" className={loginLinkClass}>
          CINELOG
        </Link>
      </main>
    )
  }

  return (
    // 이 페이지는 사진(OG 이미지)과 달리 고정 크기가 아니다 — 무슨 수를 써서든
    // 절대 잘리면 안 된다. flex-1/justify-center 같은 "화면 중앙 정렬" 트릭을
    // 전혀 안 쓴다 — 짧은 내용일 땐 화면 위쪽에 붙어 보이는 대신, 내용이 길어질
    // 때 어떤 레이아웃 계산도 클리핑을 일으킬 여지가 없는, 그냥 위에서 아래로
    // 흐르는 가장 단순한 구조를 쓴다.
    <main className="flex min-h-dvh w-screen flex-col items-center bg-black px-6 pt-10 pb-16 sm:py-20">
      {/* 예전엔 화면 어디서든 항상 보이도록 fixed로 띄웠는데, 그때의 카드가
          가운데로 좁게 몰려 있어 왼쪽 위 구석이 늘 비어 있었던 것과 달리
          지금 티켓은 페이지 폭 가까이 꽉 차서(모바일) 스크롤하면 티켓 내용이
          그 구석을 그대로 지나가며 겹쳐 보였다. 그래서 모바일에서는 티켓 위
          일반 흐름으로 두고, 옆 여백이 넉넉해지는 sm 이상에서만 다시 고정한다. */}
      <div className="mb-6 flex flex-col items-center gap-1.5 sm:fixed sm:left-6 sm:top-6 sm:z-10 sm:mb-0 sm:items-start">
        <Link
          href="/"
          className="text-[9px] font-light tracking-[0.5em] text-white/20 outline-none transition-colors duration-700 hover:text-white/50"
        >
          CINELOG
        </Link>
        <Link href="/login" className={loginLinkClass}>
          나도 기록하기
        </Link>
      </div>

      <MovieShareCard movie={movie} slug={slug} />
    </main>
  )
}
