'use client'

import { PencilIcon } from '@/components/icons/PencilIcon'
import type { MovieViewing } from '@/data/movies'

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

/**
 * 이 영화의 감상(다시 본 것 포함) 전체를 세로 목록으로 보여준다. 처음엔 점
 * 하나당 감상 하나인 타임라인이었는데, 실제로 써보니 점이 너무 작아 안
 * 보이고 탭 조작법도 안 와닿는다는 피드백으로 걷어냈다 — 세로 스크롤은
 * 새로 설명할 게 없는, 이미 다들 아는 조작이라 그게 더 낫다는 결론.
 * 최신 감상만 수정/삭제 가능하다(과거 감상 수정은 아직 지원 안 함).
 */
export function ViewingHistoryTimeline({
  viewings,
  guestEnabled,
  onEditLatest,
  onDeleteLatest,
}: {
  /** 최신순(index 0 = 가장 최근) 정렬, 최소 1개. */
  viewings: MovieViewing[]
  guestEnabled: boolean
  onEditLatest: () => void
  onDeleteLatest: () => void
}) {
  if (viewings.length === 0) return null

  return (
    <div className="flex w-full flex-col gap-4">
      {viewings.map((v, i) => {
        const isLatest = i === 0
        return (
          <div
            key={v.id}
            className={`flex flex-col items-center gap-1.5 ${i > 0 ? 'border-t border-white/5 pt-4' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              {v.rating != null && <span className="text-sm tracking-[0.15em] text-white/60">{ratingLine(v.rating)}</span>}
              <span className="text-[11px] tracking-[0.15em] text-white/35">{v.watchedAt}</span>
              {guestEnabled && isLatest && (
                <button
                  type="button"
                  onClick={onEditLatest}
                  aria-label="이 감상 고치기"
                  title="이 감상 고치기"
                  className="-m-2 flex items-center justify-center p-2 text-white/35 outline-none transition-colors duration-500 hover:text-white/70"
                >
                  <PencilIcon />
                </button>
              )}
              {guestEnabled && isLatest && viewings.length > 1 && (
                <button
                  type="button"
                  onClick={onDeleteLatest}
                  className="text-[10px] tracking-[0.2em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60"
                >
                  삭제
                </button>
              )}
            </div>

            {v.note && (
              <p className="w-full max-w-full whitespace-pre-line text-left text-[12px] leading-relaxed tracking-wide text-white/45">
                {v.note}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
