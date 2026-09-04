'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BLACKHOLE, EASE_SLOW } from '@/lib/motion'

type Phase = 'dim' | 'converge' | 'collapse' | 'void'

type Props = {
  onArrive: () => void
}

// 착석 이후: 정적 → 서서히 어두워짐 → 주변 공간이 중심으로 끌려 들어감 →
// 중앙에 검은 공간이 자라나 화면을 삼킨다 → 완전한 암전 속 짧은 정적 →
// 영화 우주로 진입한다.
export function BlackHoleTransition({ onArrive }: Props) {
  const [phase, setPhase] = useState<Phase>('dim')
  const reducedMotion = useReducedMotion()

  // 동작 줄이기를 켠 사용자에게는 이 다단계 확대/수렴 연출을 그대로 축소해서
  // 재현하지 않는다 — 화면 전체가 회전·확대되는 게 이 장면의 핵심인데, 그게
  // 바로 어지러움을 유발하는 종류의 움직임이다. 대신 단순한 암전 페이드로
  // 같은 서사적 역할("다른 공간으로 넘어간다")만 짧게 수행한다.
  if (reducedMotion) {
    return (
      <motion.div
        className="h-full w-full bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_SLOW }}
        onAnimationComplete={() => window.setTimeout(onArrive, 300)}
      />
    )
  }

  return <BlackHoleTransitionFull phase={phase} setPhase={setPhase} onArrive={onArrive} />
}

function BlackHoleTransitionFull({
  phase,
  setPhase,
  onArrive,
}: {
  phase: Phase
  setPhase: (phase: Phase) => void
  onArrive: () => void
}) {
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('converge'), BLACKHOLE.dim)
    const t2 = window.setTimeout(() => setPhase('collapse'), BLACKHOLE.dim + BLACKHOLE.converge)
    const t3 = window.setTimeout(
      () => setPhase('void'),
      BLACKHOLE.dim + BLACKHOLE.converge + BLACKHOLE.collapse,
    )
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [setPhase])

  useEffect(() => {
    if (phase !== 'void') return
    // 완전히 검게 수렴한 뒤, 우주가 나타나기 전 짧은 침묵을 둔다.
    const timer = window.setTimeout(onArrive, 900)
    return () => window.clearTimeout(timer)
  }, [phase, onArrive])

  const spaceScale = phase === 'dim' ? 1 : phase === 'converge' ? 0.04 : 0
  const spaceOpacity = phase === 'dim' ? 0.55 : phase === 'converge' ? 0.28 : 0
  const spaceDuration = phase === 'dim' ? BLACKHOLE.dim : phase === 'converge' ? BLACKHOLE.converge : 400

  const holeScale = phase === 'dim' ? 0 : phase === 'converge' ? 0.7 : 70
  const holeDuration = phase === 'collapse' || phase === 'void' ? BLACKHOLE.collapse : BLACKHOLE.converge

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* 좌석에서 보이던 공간 전체가 하나의 점으로 끌려 들어간다 */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 50%' }}
        initial={false}
        animate={{ scale: spaceScale, opacity: spaceOpacity }}
        transition={{ duration: spaceDuration / 1000, ease: EASE_SLOW }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '28%',
            transform: 'translate(-50%, -50%)',
            width: 'min(70vw, 900px)',
            height: 'min(38vw, 420px)',
            background: 'radial-gradient(ellipse at center, rgba(230,234,244,0.09), rgba(230,234,244,0.01) 70%)',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            width: '20%',
            height: '28%',
            borderRadius: '8px 8px 0 0',
            background: 'rgba(0,0,0,0.92)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: '10%',
            width: '20%',
            height: '28%',
            borderRadius: '8px 8px 0 0',
            background: 'rgba(0,0,0,0.92)',
          }}
        />
      </motion.div>

      {/* 사건의 지평선 — 중심에서 자라나 화면을 완전히 삼킨다 */}
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          background: 'radial-gradient(circle, #000 60%, rgba(0,0,0,0.985) 78%, rgba(6,6,9,0) 100%)',
          boxShadow: '0 0 30px 6px rgba(210,220,240,0.045)',
        }}
        initial={false}
        animate={{ scale: holeScale }}
        transition={{ duration: holeDuration / 1000, ease: EASE_SLOW }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 48%, transparent 15%, rgba(0,0,0,0.95) 100%)',
          opacity: phase === 'dim' ? 0.45 : 1,
          transition: `opacity ${BLACKHOLE.dim}ms ease`,
        }}
      />

      {/* 화면이 완전히 검게 수렴한 뒤에도 아주 미세하게 살아있는 점 하나를 남겨둔다 —
          이게 없으면 이 정적이 "무겁고 느린 연출"이 아니라 "멈춘 화면"처럼 읽힌다. */}
      {(phase === 'collapse' || phase === 'void') && (
        <div
          className="animate-pulse-slow pointer-events-none absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'rgba(255,226,190,0.9)',
            boxShadow: '0 0 8px 2px rgba(255,214,150,0.25)',
          }}
        />
      )}
    </div>
  )
}
