'use client'

import type { Seat as SeatType } from '@/lib/seatLayout'

type Props = {
  seat: SeatType
  isHovered: boolean
  isSelected: boolean
  isDimmed: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

// 등받이/팔걸이/좌판을 각각 별도 도형으로 그린다 — 처음엔 좌석 하나를 사각형
// 하나로 표현했는데, 그러면 모니터/스크린처럼 보인다는 피드백을 받았다.
// 실사 3D 의자를 만들 필요는 없고, 이 세 부위가 분리되어 있다는 정도만으로도
// 멀리서는 추상적인 점처럼, 가까이서는 "영화관 좌석"으로 읽힌다.
export function Seat({ seat, isHovered, isSelected, isDimmed, onHover, onSelect }: Props) {
  const active = isHovered || isSelected
  // 크기/간격의 원근 축소는 CSS perspective(translateZ)가 계산한다 — 여기서
  // 다시 scale을 줄이면 이중 축소가 되어 뒷열이 부자연스럽게 눌려 보인다.
  const baseOpacity = 1 - seat.depth * 0.4
  const opacity = isDimmed ? 0.08 : baseOpacity

  const fillIdle = 'linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.015))'
  const fillActive = 'linear-gradient(to bottom, rgba(255,220,175,0.14), rgba(255,220,175,0.03))'
  const borderIdle = '1px solid rgba(255,255,255,0.055)'
  const borderActive = '1px solid rgba(255,206,140,0.32)'
  const shapeTransition = 'background 0.8s ease, border-color 0.8s ease, box-shadow 0.8s ease'

  return (
    <button
      type="button"
      aria-label={`좌석 ${seat.id} 선택`}
      onMouseEnter={() => onHover(seat.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(seat.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(seat.id)}
      className="absolute outline-none"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate3d(${seat.x}px, ${seat.y}px, ${seat.z}px) translate(-50%, -50%) scale(${active ? 1.08 : 1})`,
        opacity,
        transition: 'opacity 0.9s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div className="relative" style={{ width: 52, height: 44 }}>
        {/* 바닥에 놓여 있음을 암시하는 아주 약한 그림자 — 붕 떠 보이지 않도록 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -5,
            width: 34,
            height: 7,
            transform: 'translateX(-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 75%)',
            filter: 'blur(1px)',
          }}
        />

        {/* 좌판 — 등받이 아래로 살짝 드러나는 얇은 단 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 2,
            width: 28,
            height: 6,
            transform: 'translateX(-50%)',
            borderRadius: 1,
            background: active ? 'rgba(255,214,150,0.07)' : 'rgba(255,255,255,0.02)',
            transition: shapeTransition,
          }}
        />

        {/* 팔걸이 (좌) */}
        <div
          style={{
            position: 'absolute',
            left: 3,
            bottom: 2,
            width: 7,
            height: 18,
            borderRadius: '2px 2px 1px 1px',
            background: active ? fillActive : fillIdle,
            border: active ? borderActive : borderIdle,
            transition: shapeTransition,
          }}
        />

        {/* 팔걸이 (우) */}
        <div
          style={{
            position: 'absolute',
            right: 3,
            bottom: 2,
            width: 7,
            height: 18,
            borderRadius: '2px 2px 1px 1px',
            background: active ? fillActive : fillIdle,
            border: active ? borderActive : borderIdle,
            transition: shapeTransition,
          }}
        />

        {/* 등받이 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 7,
            width: 30,
            height: 27,
            transform: 'translateX(-50%)',
            borderRadius: '10px 10px 2px 2px',
            background: active ? fillActive : fillIdle,
            border: active ? borderActive : borderIdle,
            boxShadow: active ? '0 0 6px rgba(255,206,140,0.10)' : 'none',
            transition: shapeTransition,
          }}
        />
      </div>
    </button>
  )
}
