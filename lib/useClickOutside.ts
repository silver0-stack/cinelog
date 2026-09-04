'use client'

import { useEffect, type RefObject } from 'react'

/**
 * enabled인 동안, ref가 가리키는 요소 바깥을 누르면 onOutside를 호출한다.
 * GuidePanel/AccountMenu처럼 "버튼을 다시 눌러야만 닫히던" 토글 패널들이
 * 여백 클릭으로도 닫히게 하는 데 쓴다.
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, enabled: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!enabled) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [enabled, ref, onOutside])
}
