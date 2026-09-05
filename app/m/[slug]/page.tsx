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
    <main className="flex min-h-dvh w-screen flex-col items-center bg-black px-6 py-20">
      {/* 메모가 길면 카드 밑에 흐름대로 두는 CTA는 한참 밑으로 밀린다(의도된
          동작, 위 주석 참고 — 절대 안 잘리게 하려고 흐름대로 둔다). 그래서
          스크롤 안 해도 바로 보이는 고정 진입점을 화면 위 구석에 둔다.
          위쪽은 콘텐츠가 아래로만 자라니 겹쳐서 가릴 위험이 없다. */}
      <div className="fixed left-6 top-6 z-10 flex flex-col items-start gap-1.5">
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
