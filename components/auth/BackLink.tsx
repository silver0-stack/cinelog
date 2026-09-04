'use client'

import { useRouter } from 'next/navigation'

// 브라우저 자체 뒤로가기 UI에 기대지 않는다 — 카카오톡/인스타그램 인앱
// 브라우저처럼 뒤로가기 버튼이 작거나 안 보이는 환경에서도 똑같이 동작하도록,
// 이 링크 자체가 history.back()을 실행한다. 이 탭에서 처음 연 페이지라
// 돌아갈 히스토리가 없으면(history.length <= 1) 홈으로 보낸다.
export function BackLink() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back()
        } else {
          router.push('/')
        }
      }}
      className="absolute left-6 top-6 text-[9px] font-light tracking-[0.5em] text-white/20 outline-none transition-colors duration-700 hover:text-white/50"
    >
      ← 뒤로
    </button>
  )
}
