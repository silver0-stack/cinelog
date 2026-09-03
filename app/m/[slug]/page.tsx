import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchCardMovie } from './_data'
import { ViewingHistoryStepper } from '@/components/movie/ViewingHistoryStepper'
import { secondaryNavLinkClass as loginLinkClass } from '@/lib/uiStyles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const movie = await fetchCardMovie(slug)

  if (!movie) return { title: 'CINELOG' }

  const description = [ratingLine(movie.rating), `${movie.year} · ${movie.director}`].filter(Boolean).join(' · ')

  return {
    title: `${movie.title} — CINELOG`,
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
  const movie = await fetchCardMovie(slug)

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

  // 최신 감상(평점/메모)은 위에서 이미 보여주니, "감상의 연혁"에는 그 이전
  // 감상들만 넘겨서 볼 수 있게 한다 — 같은 내용이 두 번 겹쳐 보이지 않게.
  const priorViewings = (movie.viewings ?? []).slice(1)

  return (
    // 이 페이지는 사진(OG 이미지)과 달리 고정 크기가 아니다 — 무슨 수를 써서든
    // 절대 잘리면 안 된다. flex-1/justify-center 같은 "화면 중앙 정렬" 트릭을
    // 전혀 안 쓴다 — 짧은 내용일 땐 화면 위쪽에 붙어 보이는 대신, 내용이 길어질
    // 때 어떤 레이아웃 계산도 클리핑을 일으킬 여지가 없는, 그냥 위에서 아래로
    // 흐르는 가장 단순한 구조를 쓴다.
    <main className="flex min-h-dvh w-screen flex-col items-center bg-black px-6 py-20">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 text-center">
        {movie.posterPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
            alt=""
            className="h-72 w-48 object-cover opacity-80 saturate-[0.7] brightness-[0.85]"
          />
        )}

        <div>
          <h1 className="text-base font-light tracking-[0.15em] text-white/90">{movie.title}</h1>
          <p className="mt-1 text-xs font-light tracking-[0.2em] text-white/40">
            {movie.year} · {movie.director}
          </p>
        </div>

        {movie.rating != null && <div className="text-sm tracking-[0.3em] text-white/60">{ratingLine(movie.rating)}</div>}

        {movie.note && (
          <p className="max-w-xs text-xs font-light italic leading-relaxed tracking-wide text-white/50">“{movie.note}”</p>
        )}

        {priorViewings.length > 0 && (
          <div className="flex w-full flex-col items-center gap-3 border-t border-white/10 pt-6 text-[10px] tracking-widest text-white/30">
            <p className="text-white/25">감상의 연혁</p>
            <ViewingHistoryStepper viewings={priorViewings} />
          </div>
        )}

        <a
          href={`/m/${slug}/opengraph-image`}
          download={`${movie.title}.png`}
          className="mt-2 text-[10px] font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-500 hover:text-white/60"
        >
          이미지 저장
        </a>
      </div>

      <div className="mt-16 flex flex-col items-center gap-3">
        <p className="text-[9px] font-light tracking-[0.5em] text-white/20">CINELOG</p>
        <Link href="/login" className={loginLinkClass}>
          나도 기록하기
        </Link>
      </div>
    </main>
  )
}
