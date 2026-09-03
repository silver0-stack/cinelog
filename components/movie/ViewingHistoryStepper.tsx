'use client'

import { useState } from 'react'
import type { MovieViewing } from '@/data/movies'

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

/**
 * 과거 감상을 한 번에 죽 쌓아 보여주지 않고 한 장씩 넘겨본다. 다시 본 횟수가
 * 많아질수록 스크롤만 길어지는 문제(peek 패널/카드 페이지 둘 다 좁은 공간)를
 * 피하면서, "목록"이 아니라 "그때그때 하나씩 돌아보는" 회고에 더 맞는 형태다.
 *
 * viewings는 최근 것부터(index 0 = 가장 최근) 정렬되어 들어온다고 가정한다 —
 * 이미 위에서 최신 감상을 따로 보여준 다음이므로, 여기 index 0은 "그 다음으로
 * 최근"이 된다.
 */
export function ViewingHistoryStepper({ viewings }: { viewings: MovieViewing[] }) {
  const [index, setIndex] = useState(0)
  if (viewings.length === 0) return null

  const current = viewings[index]

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[10px] tracking-[0.25em] text-white/40">
          {current.watchedAt}
          {current.rating != null ? `   ·   ${ratingLine(current.rating)}` : ''}
        </p>
        {current.note && (
          <p className="max-w-[220px] text-center text-[10px] font-light italic leading-relaxed tracking-wide text-white/30">
            “{current.note}”
          </p>
        )}
      </div>

      {viewings.length > 1 && (
        <div className="flex items-center gap-4 text-[9px] tracking-widest text-white/25">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(viewings.length - 1, i + 1))}
            disabled={index >= viewings.length - 1}
            className="outline-none transition-colors duration-300 hover:text-white/60 disabled:opacity-25"
          >
            ‹ 더 이전
          </button>
          <span>
            {index + 1} / {viewings.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index <= 0}
            className="outline-none transition-colors duration-300 hover:text-white/60 disabled:opacity-25"
          >
            더 최근 ›
          </button>
        </div>
      )}
    </div>
  )
}
