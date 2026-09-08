'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { track } from '@vercel/analytics'

// 어느 채널(디스콰이엇/트위터/스레드 등)에서 왔는지 감으로만 판단하지 않으려고
// 추가 — 공유 링크에 ?utm_source=disquiet 같은 값을 붙이면 첫 방문 시 한 번
// Vercel Analytics 커스텀 이벤트로 남긴다. URL을 바꾸거나 DB에 별도로 쌓지
// 않는다 — Vercel 대시보드의 이벤트 필터만으로 채널별 방문/전환을 나눠보기엔
// 이 규모에서 충분하다.
function UtmTrackerInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utmSource = searchParams.get('utm_source')
    if (!utmSource) return

    track('landing_visit', {
      utm_source: utmSource,
      utm_medium: searchParams.get('utm_medium') ?? '',
      utm_campaign: searchParams.get('utm_campaign') ?? '',
    })
  }, [searchParams])

  return null
}

export function UtmTracker() {
  return (
    <Suspense fallback={null}>
      <UtmTrackerInner />
    </Suspense>
  )
}
