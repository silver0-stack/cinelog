'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Entrance } from '@/components/entrance/Entrance'
import { CinemaScene } from '@/components/cinema/CinemaScene'
import { SeatedView } from '@/components/seat/SeatedView'
import { BlackHoleTransition } from '@/components/blackhole/BlackHoleTransition'
import { DemoUniverseStage } from '@/components/universe/DemoUniverseStage'
import { BLACKHOLE, DURATION, EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

type Stage = 'entrance' | 'cinema' | 'seated' | 'blackhole' | 'universe'

const RITUAL_DONE_KEY = 'cinelog:ritual-done'

// 이 의식(입장→영화관→좌석→블랙홀→우주)은 첫 방문/비로그인 쇼케이스 진입 전용이다
// (P2-7). 로그인한 재방문자는 app/page.tsx가 여기까지 오지 않고 곧장 /archive로
// 보낸다 — 매번 13초짜리 의식을 반복시키는 건 재방문의 마찰이기 때문이다.
//
// 단계를 되돌리는 단축키(ESC 등)는 의도적으로 두지 않는다. 예전에 SeatedView/
// BlackHoleTransition에 ESC로 극장으로 돌아가는 개발용 리셋을 넣은 적이 있는데,
// 브라우저가 ESC를 자체적으로 가로채는 경우(주소창 포커스 등)와 충돌해서
// 의도치 않은 페이지 이동처럼 보이는 문제가 있었다. 테스트 중 처음부터 다시
// 보고 싶으면 새로고침하면 된다 — 이건 CLAUDE.md에도 없는, 명시적으로 요청받지
// 않은 기능이었어서 다시 추가하지 않는 게 맞다.
export function HomeRitual() {
  const [stage, setStage] = useState<Stage>('entrance')
  const [seatId, setSeatId] = useState<string | null>(null)
  // 세션스토리지 확인이 끝나기 전까지는 아무 것도 그리지 않는다(검은 화면만
  // 유지) — 그렇지 않으면 "ENTER"가 잠깐 반짝였다가 곧장 우주로 넘어가는
  // 깜빡임이 생긴다. 서버 렌더와 첫 클라이언트 렌더는 항상 이 상태로 일치한다.
  const [ready, setReady] = useState(false)

  const handleEnter = useCallback(() => setStage('cinema'), [])

  const handleSeated = useCallback((id: string) => {
    setSeatId(id)
    setStage('seated')
  }, [])

  const handleArrive = useCallback(() => setStage('universe'), [])

  // 좌석에 앉은 채로 잠시 정적을 두었다가, 그 침묵 속에서 블랙홀 전환이 시작된다.
  useEffect(() => {
    if (stage !== 'seated') return
    const timer = window.setTimeout(() => setStage('blackhole'), BLACKHOLE.hold)
    return () => window.clearTimeout(timer)
  }, [stage])

  // 이번 세션에 의식을 이미 한 번 봤다면, 뒤로가기/새로고침 등 어떤 경로로
  // 다시 이 페이지에 오든 처음부터 다시 재생하지 않고 곧장 우주로 간다.
  // "로그인 화면에서 뒤로가기했더니 극장으로 돌아가버렸다"처럼, 브라우저의
  // 뒤로가기가 React 상태를 복원하는지 여부는 예측할 수 없어서, 세션스토리지에
  // 직접 남겨서 항상 같은 결과가 나오게 한다.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(RITUAL_DONE_KEY) === '1') {
        // 세션스토리지는 서버에서 읽을 수 없어 하이드레이션 이후에만 알 수
        // 있다 — 초기 렌더를 서버와 맞추려고 일부러 마운트 후에 갱신한다.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStage('universe')
      }
    } catch {
      // 세션스토리지를 못 쓰는 환경(프라이빗 모드 등)에서는 그냥 매번 의식을 다시 본다.
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (stage !== 'universe') return
    try {
      sessionStorage.setItem(RITUAL_DONE_KEY, '1')
    } catch {
      // 못 쓰면 어쩔 수 없다 — 다음에도 처음부터 다시 볼 뿐, 기능이 깨지진 않는다.
    }
  }, [stage])

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-black">
      <AnimatePresence>
        {ready && stage === 'entrance' && (
          <motion.div
            key="entrance"
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fade, ease: EASE_SLOW }}
            className="absolute inset-0"
          >
            <Entrance onEnter={handleEnter} />
          </motion.div>
        )}

        {stage === 'cinema' && (
          <motion.div
            key="cinema"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fade, ease: EASE_SLOW }}
            className="absolute inset-0"
          >
            <CinemaScene onSeated={handleSeated} />
          </motion.div>
        )}

        {stage === 'seated' && seatId && (
          <motion.div
            key="seated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.seatedReveal, ease: EASE_SLOW }}
            className="absolute inset-0"
          >
            <SeatedView seatId={seatId} />
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
