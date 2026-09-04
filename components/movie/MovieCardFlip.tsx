'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { ViewingHistoryStepper } from './ViewingHistoryStepper'
import type { Movie } from '@/data/movies'

// peek 패널(MoviePeekPanel)과 같은 앞면(포스터, 객관적 정보)/뒷면(평점·메모·
// 이력) 회전 — "카드 링크에서도 앞뒤 나눠서 보여주자"는 요청으로, 우주 안의
// peek 패널과 같은 문법을 이 독립 페이지에도 그대로 적용한다.
const FLIP_TRANSITION = { duration: 0.9, ease: EASE_SLOW }

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export function MovieCardFlip({ movie, slug }: { movie: Movie; slug: string }) {
  const [showBack, setShowBack] = useState(false)
  const flip = () => setShowBack((v) => !v)

  // 최신 감상(평점/메모)은 뒷면에서 이미 보여주니, "감상의 연혁"에는 그 이전
  // 감상들만 넘겨서 볼 수 있게 한다 — 같은 내용이 두 번 겹쳐 보이지 않게.
  const priorViewings = (movie.viewings ?? []).slice(1)

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showBack ? (
        <motion.div
          key="back"
          initial={{ rotateY: -90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: 90, opacity: 0 }}
          transition={FLIP_TRANSITION}
          style={{ transformPerspective: 900 }}
          className="flex w-full max-w-xs flex-col items-center gap-6 text-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) flip()
          }}
        >
          <button
            type="button"
            onClick={flip}
            className="self-start text-[10px] tracking-[0.3em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60"
          >
            ← 포스터
          </button>

          {movie.rating != null && <div className="text-sm tracking-[0.3em] text-white/60">{ratingLine(movie.rating)}</div>}

          {movie.note && (
            <p className="w-full max-w-xs whitespace-pre-line text-left text-xs font-light leading-relaxed tracking-wide text-white/50">
              {movie.note}
            </p>
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
        </motion.div>
      ) : (
        <motion.div
          key="front"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={FLIP_TRANSITION}
          style={{ transformPerspective: 900 }}
          className="flex w-full max-w-xs cursor-pointer flex-col items-center gap-6 text-center"
          onClick={flip}
        >
          {movie.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt=""
              className="h-72 w-48 object-cover opacity-80 saturate-[0.7] brightness-[0.85]"
            />
          ) : (
            <div className="flex h-72 w-48 items-center justify-center border border-white/10">
              <span className="text-[10px] tracking-[0.2em] text-white/20">포스터 없음</span>
            </div>
          )}

          <div>
            <h1 className="text-base font-light tracking-[0.15em] text-white/90">{movie.title}</h1>
            <p className="mt-1 text-xs font-light tracking-[0.2em] text-white/40">
              {movie.year} · {movie.director}
            </p>
            {movie.genres.length > 0 && (
              <p className="mt-1 text-xs font-light tracking-[0.15em] text-white/30">{movie.genres.join(' · ')}</p>
            )}
          </div>

          <p className="text-[9px] tracking-[0.2em] text-white/20">눌러서 뒤집기</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
