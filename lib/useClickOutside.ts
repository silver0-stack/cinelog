'use client'

import { useEffect, type RefObject } from 'react'

/**
 * enabled인 동안, ref가 가리키는 요소 바깥을 누르면 onOutside를 호출한다.
 * GuidePanel/AccountMenu처럼 "버튼을 다시 눌러야만 닫히던" 토글 패널들이
 * 여백 클릭으로도 닫히게 하는 데 쓴다.
 *
 * ignoreSelector — 이 셀렉터에 걸리는 요소를 누른 건 "바깥 클릭"으로 안 친다.
 * (2026-09-08) MovieSearch에서 검색으로 밝아진 별을 클릭했을 때 실제로 겪은
 * 버그: mousedown이 click보다 먼저 일어나서, 별을 누른 순간 이걸 "바깥 클릭"으로
 * 판단해 검색을 먼저 닫아버렸다. 그러면 하이라이트가 지워지며 카메라가 검색
 * 이전 위치로 그 자리에서 바로 이동하는데, 이게 마우스 버튼을 누르고 있는
 * 동안(mouseup 전에) 일어나서 방금 누르려던 별이 커서 밑에서 다른 자리로
 * 슬쩍 옮겨가 버렸다 — mouseup 시점엔 이미 그 별이 없어서 클릭 자체가
 * 안 잡혔다("클릭이 어떨 땐 되고 어떨 땐 안 된다"는 실사용 피드백의 진짜
 * 원인). 별을 누른 것 자체를 처음부터 "바깥 클릭"에서 제외해서, 그 흔들림이
 * 아예 안 생기게 막는다.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onOutside: () => void,
  ignoreSelector?: string,
) {
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (!ref.current || ref.current.contains(target)) return
      if (ignoreSelector && target instanceof Element && target.closest(ignoreSelector)) return
      onOutside()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [enabled, ref, onOutside, ignoreSelector])
}
