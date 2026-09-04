'use client'

import { useCallback, useState } from 'react'
import { MovieUniverse } from './MovieUniverse'
import { DemoAddStar } from './DemoAddStar'
import { CreatorUniverseLink } from './CreatorUniverseLink'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { movies as staticMovies, type Movie } from '@/data/movies'

// 비로그인 데모 우주. 실험 삼아 추가한 별(DemoAddStar)도, 24편에 남기는 평점/메모
// (onGuestMutate)도 이 컴포넌트가 언마운트되면(새로고침 등) 함께 사라진다 —
// 로그인 없이 "이렇게 쓰는 거예요" 정도만 보여주는 게 목적이라 의도적으로 저장하지
// 않는다. 실제 계정(/archive)의 감상 기록과는 완전히 분리된 로컬 상태다.
export function DemoUniverseStage() {
  const [movies, setMovies] = useState<Movie[]>(staticMovies)
  const [focusMovieId, setFocusMovieId] = useState<string | null>(null)

  const handleGuestMutate = useCallback((movieId: string, mutate: (movie: Movie) => Movie) => {
    setMovies((prev) => prev.map((m) => (m.id === movieId ? mutate(m) : m)))
  }, [])

  return (
    <>
      <MovieUniverse
        movies={movies}
        showIdleHint
        focusMovieId={focusMovieId}
        onGuestMutate={handleGuestMutate}
      />

      {/* "이게 뭐야, 언니가 본거야?" 하는 혼란을 정직한 라벨 한 줄로 없앤다 —
          별도 시스템처럼 안 느껴지게, 큐레이션이라고 밝힌다. "진짜 우주" 링크를
          바로 아래 붙여서 "이건 데모고, 진짜는 이거야"가 한 쌍으로 읽히게 한다 —
          예전엔 화면 반대쪽 구석에 따로 떨어져 있어서 왜 있는 링크인지 맥락이 없었다. */}
      <div className="absolute left-6 top-6 z-10 flex flex-col items-start gap-1.5">
        <p className="pointer-events-none text-[10px] font-light tracking-[0.25em] text-white/25">
          데모 우주 · 내가 고른 24편
        </p>
        <CreatorUniverseLink />
      </div>

      <GuidePanel
        variant="demo"
        triggerClassName="absolute right-6 top-6 z-10 text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
      />

      <DemoAddStar
        onAdd={(movie) => {
          setMovies((prev) => [...prev, movie])
          setFocusMovieId(movie.id)
        }}
      />
    </>
  )
}
