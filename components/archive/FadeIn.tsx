'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { DURATION, EASE_SLOW } from '@/lib/motion'

const subscribe = () => () => {}

// 서버에서는 항상 false, 클라이언트 하이드레이션 이후에는 true — "지금 이 렌더가
// 서버 스냅샷인가 클라이언트 스냅샷인가"를 React가 직접 구분해주는 공식 API라서,
// useEffect 안에서 setState를 호출해 캐스케이드 렌더를 유발하는 것보다 안전하다.
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

// 로그인한 재방문자는 좌석→블랙홀 의식을 다시 거치지 않고 곧장 자신의 우주로
// 들어온다(P2-7) — 대신 짧은 페이드만 남겨서 같은 세계관이라는 느낌을 유지한다.
//
// children(MovieUniverse)은 마운트된 뒤에만 렌더링한다. V1에서는 MovieUniverse가
// 좌석→블랙홀을 거친 뒤 클라이언트에서만 마운트돼서 서버 렌더링 결과물에 아예
// 없었는데, 여기서는 서버 컴포넌트가 곧바로 렌더링해 SSR에 포함시키다 보니
// framer-motion이 계산한 위치 값(소수점 정밀도)이 서버/클라이언트에서 미묘하게
// 달라져 하이드레이션 불일치가 났다. 마운트 후에만 그리면 서버 출력과 비교할
// 대상이 없어져 문제가 사라진다.
export function FadeIn({ children }: { children: ReactNode }) {
  const mounted = useMounted()

  if (!mounted) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.fade, ease: EASE_SLOW }}
      className="absolute inset-0"
    >
      {children}
    </motion.div>
  )
}
