import type { Metadata } from 'next'
import Link from 'next/link'
import { getSharedUniverseData } from './_data'
import { SharedUniverseShell } from '@/components/universe/SharedUniverseShell'
import { combineLoggedMovies } from '@/lib/loggedMovies'
import { attachEditorialConnections } from '@/lib/editorialConnections'
import { combineUniverseTexts, type UniverseText } from '@/lib/universeTexts'
import { summarizeUniverse, rewatchedMovies } from '@/lib/universeInsights'
import { secondaryNavLinkClass as loginLinkClass } from '@/lib/uiStyles'
import { getLocale } from '@/lib/i18n/getLocale'
import { t } from '@/lib/i18n/dictionary'

// opengraph-image.tsx가 같은 데이터로 미리보기 카드를 그려준다 — 여기서도
// 그 카드에 쓰이는 요약(편수/대표 인사이트)과 같은 문구를 그대로 쓴다.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await getSharedUniverseData(slug)
  const rows = result?.rows ?? []

  if (!result || rows.length === 0) return { title: 'CINELOG' }

  const movies = combineLoggedMovies(rows, result.viewingRows)
  const insights = summarizeUniverse(movies)
  const headline = insights[0]
  const title = `${movies.length}편의 영화가 이룬 우주 · CINELOG`
  const description = [headline ? `${headline.label} · ${headline.value}` : null, `${movies.length}편의 영화`]
    .filter(Boolean)
    .join(' · ')

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// 비동기 공유 링크의 읽기 전용 뷰(P2-8). 로그인 없이도 볼 수 있고, 드래그로
// 관계를 조정하는 건 여기서는 안 된다 — editable을 아예 안 켠다.
export default async function SharedUniversePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const result = await getSharedUniverseData(slug)

  if (!result) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
        <p className="text-xs font-light tracking-widest text-white/40">{t(locale, 'notFound.link')}</p>
        <Link href="/" className={loginLinkClass}>
          CINELOG
        </Link>
      </main>
    )
  }

  if (result.rows.length === 0) {
    return (
      <main className="flex h-dvh w-screen flex-col items-center justify-center gap-6 bg-black">
        <p className="text-xs font-light tracking-widest text-white/40">{t(locale, 'notFound.noMoviesYet')}</p>
        <Link href="/" className={loginLinkClass}>
          CINELOG
        </Link>
      </main>
    )
  }

  const movies = attachEditorialConnections(
    combineLoggedMovies(result.rows, result.viewingRows),
    result.connectionRows,
  )
  const insights = summarizeUniverse(movies, locale)
  const rewatched = rewatchedMovies(movies)
  const texts: UniverseText[] = combineUniverseTexts(result.textRows)

  return <SharedUniverseShell movies={movies} insights={insights} rewatched={rewatched} texts={texts} />
}
