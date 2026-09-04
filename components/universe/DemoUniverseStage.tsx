'use client'

import { useState } from 'react'
import { MovieUniverse } from './MovieUniverse'
import { DemoAddStar } from './DemoAddStar'
import { CreatorUniverseLink } from './CreatorUniverseLink'
import { GuidePanel } from '@/components/guide/GuidePanel'
import { movies as staticMovies, type Movie } from '@/data/movies'

// 비로그인 데모 우주. 실험 삼아 추가한 별(DemoAddStar)은 이 컴포넌트가 언마운트되면
// (새로고침 등) 함께 사라진다 — 의도적으로 저장하지 않는다.
export function DemoUniverseStage() {
  const [tempMovies, setTempMovies] = useState<Movie[]>([])
  const movies = tempMovies.length ? [...staticMovies, ...tempMovies] : staticMovies

  return (
    <>
      <MovieUniverse movies={movies} showIdleHint />

      {/* "이게 뭐야, 언니가 본거야?" 하는 혼란을 정직한 라벨 한 줄로 없앤다 —
          별도 시스템처럼 안 느껴지게, 큐레이션이라고 밝힌다. */}
      <p className="pointer-events-none absolute left-6 top-6 z-10 text-[10px] font-light tracking-[0.25em] text-white/25">
        데모 우주 · 내가 고른 24편
      </p>

      <GuidePanel
        variant="demo"
        triggerClassName="absolute right-6 top-6 z-10 text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
        panelClassName="absolute right-6 top-14"
      />

      <DemoAddStar onAdd={(movie) => setTempMovies((prev) => [...prev, movie])} />
      <CreatorUniverseLink />
    </>
  )
}
