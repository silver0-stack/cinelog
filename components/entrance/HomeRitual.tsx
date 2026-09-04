'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Entrance } from '@/components/entrance/Entrance'
import { BlackHoleTransition } from '@/components/blackhole/BlackHoleTransition'
import { DemoUniverseStage } from '@/components/universe/DemoUniverseStage'
import { DURATION, EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

type Stage = 'entrance' | 'blackhole' | 'universe'

// 입장 화면(랜딩 페이지)에서 "체험" 트리거를 누르면 좌석/영화관 의식 없이 곧장
// 블랙홀 전환으로 들어간다. 좌석을 하나 찾아 눌러야만 우주에 도달할 수 있던
// 예전 구조가, 그걸 못 찾으면 끝까지 입장조차 못 하는 장애물이라는 피드백으로
// 이렇게 바꿨다 — 영화관/좌석 화면(components/cinema, components/seat)은 이
// 흐름에서 더 이상 안 쓰지만, 공들인 카메라 연출이라 파일은 지우지 않고 남겨뒀다.
//
// 로그인한 재방문자는 app/page.tsx가 여기까지 오지 않고 곧장 /archive로
// 보낸다(P2-7).
//
// 예전엔 "이번 세션에 한 번 봤으면 다음부터 곧장 우주로" 건너뛰는 세션스토리지
// 플래그가 있었다 — 입장 화면이 그냥 "CINELOG / ENTER" 스플래시였을 땐 매번
// 반복시키는 게 마찰이었지만, 지금은 이용 방법/철학/FAQ가 있는 진짜 홈페이지라
// "/"에 다시 오면 항상 이 페이지가 보여야 정상이다. 그래서 그 스킵 로직을 없앴다.
export function HomeRitual() {
  const [stage, setStage] = useState<Stage>('entrance')

  const handleEnter = useCallback(() => setStage('blackhole'), [])
  const handleArrive = useCallback(() => setStage('universe'), [])

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <AnimatePresence>
        {stage === 'entrance' && (
          <motion.div
            key="entrance"
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fade, ease: EASE_SLOW }}
            className="absolute inset-0 overflow-y-auto"
          >
            <Entrance onEnter={handleEnter} />
          </motion.div>
        )}

        {stage === 'blackhole' && (
          <motion.div
            key="blackhole"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: EASE_SLOW }}
            className="absolute inset-0"
          >
            <BlackHoleTransition onArrive={handleArrive} />
          </motion.div>
        )}

        {stage === 'universe' && (
          <motion.div
            key="universe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.2, ease: EASE_SLOW }}
            className="absolute inset-0"
          >
            <DemoUniverseStage />
            <Link
              href="/login"
              className={`absolute bottom-6 right-6 z-10 ${secondaryNavLinkClass}`}
            >
              LOG IN
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
