'use client'

import { useRef, useState } from 'react'

type Props = {
  /** 이 우주에서 가장 이른 기록의 날짜(YYYY-MM-DD). */
  minDate: string
  /** 가장 최근 기록의 날짜 — 여기 도달하면 지금과 완전히 같은 상태다. */
  maxDate: string
  value: string
  onChange: (date: string) => void
  onExit: () => void
}

function toTime(dateStr: string): number {
  return new Date(dateStr).getTime()
}

// 트랙 위 비율(0~1)을 minDate~maxDate 사이의 날짜로 선형 보간한다.
function dateAtRatio(minDate: string, maxDate: string, ratio: number): string {
  const min = toTime(minDate)
  const max = toTime(maxDate)
  const t = min + (max - min) * Math.min(1, Math.max(0, ratio))
  return new Date(t).toISOString().slice(0, 10)
}

function ratioOf(minDate: string, maxDate: string, value: string): number {
  const min = toTime(minDate)
  const max = toTime(maxDate)
  if (max === min) return 1
  return Math.min(1, Math.max(0, (toTime(value) - min) / (max - min)))
}

// "우주 성장 히스토리" 스크럽 — 화면 하단에 고정된 얇은 트랙 하나와 작은 점(thumb).
// 캔버스(팬/핀치/줌)와는 완전히 별개인 독립된 DOM 요소라, 모바일에서 우주 탐색
// 제스처와 부딪히지 않는다(CLAUDE.md가 명시한 위치 선택 이유). Pointer Events라
// 마우스/터치를 같은 코드로 처리한다. 트랙 아무 곳이나 눌러도 그 지점으로 바로
// 이동하고, 누른 채로 끌면 계속 따라온다.
export function UniverseHistoryRail({ minDate, maxDate, value, onChange, onExit }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const ratio = ratioOf(minDate, maxDate, value)

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    onChange(dateAtRatio(minDate, maxDate, (clientX - rect.left) / rect.width))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    // 포인터 캡처가 실패해도(이례적인 이벤트, 일부 환경의 별난 동작 등) 스크럽
    // 자체는 계속 동작해야 한다 — 캡처는 트랙 밖으로 나가도 드래그가 이어지게
    // 하는 보너스일 뿐, 핵심 기능(눌러서 이동)의 전제조건이 아니다.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    setDragging(true)
    updateFromClientX(e.clientX)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    updateFromClientX(e.clientX)
  }
  const handlePointerUp = () => setDragging(false)

  return (
    <div className="fixed inset-x-0 bottom-6 z-20 flex flex-col items-center gap-2 px-6">
      {/* 날짜 라벨은 스크럽 중일 때만 잠깐 뜬다 — 상시 노출하면 절제된 톤과 안 맞는다. */}
      <span
        className={`text-[9px] tracking-[0.25em] text-white/50 transition-opacity duration-300 ${
          dragging ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {value}
      </span>
      <div className="flex w-full max-w-sm items-center gap-4">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-6 flex-1 cursor-pointer touch-none"
        >
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          <div
            className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
            style={{ left: `${ratio * 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 text-[9px] tracking-[0.25em] text-white/25 outline-none transition-colors duration-500 hover:text-white/60"
        >
          지금으로
        </button>
      </div>
    </div>
  )
}
