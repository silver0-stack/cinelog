'use client'

import { useState } from 'react'
import { MovieUniverse } from './MovieUniverse'
import { DemoAddStar } from './DemoAddStar'
import { CreatorUniverseLink } from './CreatorUniverseLink'
import { movies as staticMovies, type Movie } from '@/data/movies'

// 비로그인 데모 우주. 실험 삼아 추가한 별(DemoAddStar)은 이 컴포넌트가 언마운트되면
// (새로고침 등) 함께 사라진다 — 의도적으로 저장하지 않는다.
export function DemoUniverseStage() {
  const [tempMovies, setTempMovies] = useState<Movie[]>([])
  const movies = tempMovies.length ? [...staticMovies, ...tempMovies] : staticMovies

  return (
    <>
      <MovieUniverse movies={movies} showIdleHint />
      <DemoAddStar onAdd={(movie) => setTempMovies((prev) => [...prev, movie])} />
      <CreatorUniverseLink />
    </>
  )
}
