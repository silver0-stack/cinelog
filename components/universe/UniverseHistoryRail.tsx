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
      {/* 처음 보면 이 트랙이 뭘 하는 건지 감이 안 올 수 있다 — 새 팝업을 따로
          만드는 대신, 조작 중이 아닐 때 날짜가 뜨던 바로 그 자리를 설명 문구가
          대신 채운다(빈 자리 재활용이라 화면이 더 복잡해지지 않는다). 드래그를
          시작하는 순간 실제 날짜로 자연스럽게 바뀐다. */}
      <span
        className={`max-w-[260px] text-center text-[9px] leading-relaxed tracking-[0.15em] transition-opacity duration-300 ${
          dragging ? 'text-white/50 tracking-[0.25em]' : 'text-white/30'
        }`}
      >
        {dragging ? value : '드래그해서 영화가 기록된 순서대로 우주가 자라나는 걸 봐'}
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
        {/* (2026-09-06) "지금으로"라는 문구가 뭘 하는 버튼인지 바로 안 읽힌다는
            피드백 — 과거를 보다가 "현재 우주로 돌아간다"는 뜻을 명시한다. 명도도
            /25(거의 안 보임)에서 다른 상시 버튼들과 같은 수준으로 올린다
            (secondaryNavLinkClass가 이미 겪은 문제와 같다 — lib/uiStyles.ts). */}
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 text-[10px] tracking-[0.2em] text-white/55 outline-none transition-colors duration-500 hover:text-white/85"
        >
          현재로 돌아가기
        </button>
      </div>
    </div>
  )
}
