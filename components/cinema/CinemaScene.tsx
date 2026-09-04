'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useSpring, type AnimationPlaybackControls } from 'framer-motion'
import { buildSeatLayout } from '@/lib/seatLayout'
import { Seat } from '@/components/seat/Seat'
import { Screen } from './Screen'
import { DURATION, EASE_SLOW } from '@/lib/motion'
import { useIdleHint } from '@/lib/useIdleHint'

type Phase = 'exploring' | 'approaching' | 'settled'

const IDLE_HINT_DELAY = 4000
// 여기서의 "조작"은 곧 마우스 이동(카메라가 따라가는 것) 그 자체라서, 우주 화면과
// 달리 mousemove/touchmove도 idle 판정에 포함시킨다.
const CINEMA_IDLE_EVENTS = ['mousemove', 'mousedown', 'touchstart', 'touchmove'] as const

type Props = {
  onSeated: (seatId: string) => void
}

const APPROACH_SCALE = 1.9
// 좌석에 다가섰을 때 최종적으로 카메라 앞 이 정도 거리까지 끌어온다 (열 깊이와 무관하게 동일한 근접감).
const APPROACH_FINAL_Z = 420

// 마우스로 실제 공간을 걸어 다니는 듯한 이동감을 준다. 위로 움직일수록 화면 쪽(가장 먼 열)까지
// 충분히 다가갈 수 있어야 하므로 전진 범위를 후진 범위보다 훨씬 크게 잡는다.
const BASE_DOLLY = 40
const FORWARD_REACH = 420
const BACK_REACH = 140
const PAN_X_RANGE = 220
const PAN_Y_RANGE = 170
const TILT_Y_DEG = 5
const TILT_X_DEG = 3

const FOLLOW_SPRING = { type: 'spring' as const, stiffness: 24, damping: 15, mass: 1.1 }
const TILT_SPRING = { stiffness: 36, damping: 18, mass: 1 }

export function CinemaScene({ onSeated }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const seats = useMemo(() => buildSeatLayout(), [])
  const [hovered, setHovered] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const phaseRef = useRef<Phase>('exploring')
  const [phase, setPhase] = useState<Phase>('exploring')
  // 좌석 위에 커서가 있는 동안엔 카메라가 더 이상 마우스를 쫓지 않도록 잠근다.
  // 그렇지 않으면 클릭하려고 다가가는 순간 카메라가 또 움직여서 좌석이 커서 밑에서
  // 계속 도망가는 문제가 생긴다. 이미 진행 중이던 관성 이동도 그 순간 바로 멈춘다.
  const hoveredRef = useRef<string | null>(null)
  const activeControlsRef = useRef<AnimationPlaybackControls[]>([])
  const showHint = useIdleHint(containerRef, phase === 'exploring', CINEMA_IDLE_EVENTS, IDLE_HINT_DELAY)

  // 시선 회전 (아주 미세한 둘러보기)
  const tiltXRaw = useMotionValue(0)
  const tiltYRaw = useMotionValue(0)
  const tiltX = useSpring(tiltXRaw, TILT_SPRING)
  const tiltY = useSpring(tiltYRaw, TILT_SPRING)

  // 카메라의 실제 위치. 탐색 중에는 마우스를 따라 계속 재조준되고,
  // 좌석을 선택하면 같은 값이 그 좌석을 향한 한 번의 긴 이동으로 이어받는다.
  const camX = useMotionValue(0)
  const camY = useMotionValue(0)
  const camZ = useMotionValue(BASE_DOLLY)
  const camScale = useMotionValue(1)

  const setHoveredSeat = useCallback((id: string | null) => {
    if (id && !hoveredRef.current) {
      // 커서가 좌석에 막 올라간 순간: 진행 중이던 카메라 이동을 그 자리에서 즉시 멈춘다.
      activeControlsRef.current.forEach((controls) => controls.stop())
    }
    hoveredRef.current = id
    setHovered(id)
  }, [])

  // 마우스/터치 공통: 컨테이너 기준 상대 좌표(-0.5~0.5)를 받아 카메라를 그쪽으로
  // 재조준한다. 마우스는 계속 움직이는 좌표를 주지만 터치는 손가락이 닿아있는
  // 동안만 좌표를 주므로, 둘 다 이 함수 하나로 처리한다.
  const updateCameraFromRel = useCallback(
    (relX: number, relY: number) => {
      if (phaseRef.current !== 'exploring') return
      // 좌석에 올라가 있는 동안은 카메라를 그대로 고정해서 클릭이 빗나가지 않게 한다.
      if (hoveredRef.current) return

      tiltYRaw.set(relX * TILT_Y_DEG)
      tiltXRaw.set(-relY * TILT_X_DEG)

      const forwardT = Math.max(0, -relY) / 0.5
      const backT = Math.max(0, relY) / 0.5
      const targetZ = BASE_DOLLY + forwardT * FORWARD_REACH - backT * BACK_REACH

      activeControlsRef.current = [
        animate(camX, -relX * PAN_X_RANGE, FOLLOW_SPRING),
        animate(camY, -relY * PAN_Y_RANGE, FOLLOW_SPRING),
        animate(camZ, targetZ, FOLLOW_SPRING),
      ]
    },
    [tiltXRaw, tiltYRaw, camX, camY, camZ],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width - 0.5
      const relY = (e.clientY - rect.top) / rect.height - 0.5
      updateCameraFromRel(relX, relY)
    },
    [updateCameraFromRel],
  )

  const resetCamera = useCallback(() => {
    tiltXRaw.set(0)
    tiltYRaw.set(0)
    animate(camX, 0, FOLLOW_SPRING)
    animate(camY, 0, FOLLOW_SPRING)
    animate(camZ, BASE_DOLLY, FOLLOW_SPRING)
  }, [tiltXRaw, tiltYRaw, camX, camY, camZ])

  const handleSelect = useCallback(
    (seatId: string) => {
      if (phaseRef.current !== 'exploring') return
      const seat = seats.find((s) => s.id === seatId)
      if (!seat) return

      setSelectedId(seatId)
      setHoveredSeat(null)
      phaseRef.current = 'approaching'
      setPhase('approaching')

      tiltXRaw.set(0)
      tiltYRaw.set(0)

      Promise.all([
        animate(camX, -seat.x * APPROACH_SCALE, { duration: DURATION.approach, ease: EASE_SLOW }),
        animate(camY, -seat.y * APPROACH_SCALE + 30, { duration: DURATION.approach, ease: EASE_SLOW }),
        animate(camZ, APPROACH_FINAL_Z - seat.z * APPROACH_SCALE, {
          duration: DURATION.approach,
          ease: EASE_SLOW,
        }),
        animate(camScale, APPROACH_SCALE, { duration: DURATION.approach, ease: EASE_SLOW }),
      ]).then(() => {
        phaseRef.current = 'settled'
        setPhase('settled')
        window.setTimeout(() => {
          onSeated(seatId)
        }, DURATION.pause)
      })
    },
    [seats, camX, camY, camZ, camScale, tiltXRaw, tiltYRaw, setHoveredSeat, onSeated],
  )

  // 모바일에는 마우스가 없으니 터치 드래그로 같은 탐색감을 만든다. 손가락이
  // 일정 거리 이상 움직이기 전까지는 그대로 둔다 — 그래야 좌석을 짧게 탭했을 때
  // 카메라가 먼저 반응해버리지 않고 탭이 곧바로 좌석 선택으로 이어진다.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const DRAG_THRESHOLD = 8
    let exploring = false
    let startX = 0
    let startY = 0

    const relFromTouch = (t: Touch) => {
      const rect = el.getBoundingClientRect()
      return {
        relX: (t.clientX - rect.left) / rect.width - 0.5,
        relY: (t.clientY - rect.top) / rect.height - 0.5,
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      exploring = false
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]

      if (!exploring) {
        if (Math.hypot(t.clientX - startX, t.clientY - startY) <= DRAG_THRESHOLD) return
        exploring = true
      }

      e.preventDefault()
      const { relX, relY } = relFromTouch(t)
      updateCameraFromRel(relX, relY)
    }

    const handleTouchEnd = () => {
      if (exploring) resetCamera()
      exploring = false
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [updateCameraFromRel, resetCamera])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ perspective: 1400, touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetCamera}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', rotateX: tiltX, rotateY: tiltY }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            x: camX,
            y: camY,
            z: camZ,
            scale: camScale,
          }}
        >
          <Screen dimmed={phase !== 'exploring'} />
          {seats.map((seat) => (
            <Seat
              key={seat.id}
              seat={seat}
              isHovered={hovered === seat.id}
              isSelected={selectedId === seat.id}
              isDimmed={phase !== 'exploring' && selectedId !== seat.id}
              onHover={setHoveredSeat}
              onSelect={handleSelect}
            />
          ))}
        </motion.div>
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, transparent 34%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      <motion.p
        className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-light tracking-[0.3em] text-white/30"
        style={{ textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }}
        animate={{ opacity: showHint ? 1 : 0 }}
        transition={{ duration: 1.6, ease: EASE_SLOW }}
      >
        마우스를 움직여 좌석 사이를 둘러보고, 원하는 자리를 눌러봐
      </motion.p>
    </div>
  )
}
