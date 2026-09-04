'use client'

import { useEffect, useState, type RefObject } from 'react'

const DEFAULT_DELAY = 5000

/**
 * 몇 초간 지정된 이벤트가 없으면 true를 반환한다. 이벤트가 일어나는 순간 즉시
 * false로 돌아가고 타이머가 리셋된다 — 강요가 아니라 옆에서 살짝 건드리는
 * 정도의 힌트에 쓴다. MovieUniverse(조작 없음)와 CinemaScene(마우스 정지) 둘 다
 * "무엇을 idle로 볼지"가 달라서 events는 호출부에서 모듈 스코프 상수로 넘긴다
 * (매 렌더 새 배열을 넘기면 이펙트가 계속 재등록된다).
 */
export function useIdleHint(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  events: readonly string[],
  delay: number = DEFAULT_DELAY,
): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    let timer: number
    const reset = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), delay)
    }

    reset()
    events.forEach((event) => el.addEventListener(event, reset))

    return () => {
      window.clearTimeout(timer)
      events.forEach((event) => el.removeEventListener(event, reset))
    }
  }, [enabled, delay, ref, events])

  return idle
}
