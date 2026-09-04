'use client'

import { useState } from 'react'
import { getOrCreateMovieCardSlug } from '@/lib/movieShareLinks'

const actionClass = 'flex items-center gap-1 text-[9px] tracking-[0.25em] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'

// 텍스트만 있으면 "눌러도 되는 링크"인지 "눌러야 만들어지는 버튼"인지 구분이 안
// 간다는 지적으로 복사 아이콘을 붙인다. 이 앱은 어디에도 아이콘을 안 쓰지만,
// 클립보드 복사라는 동작 자체가 아이콘 없이는 잘 안 읽혀서 예외로 둔다 — 이모지
// 대신 앱의 톤(가는 선, currentColor)에 맞춘 최소한의 SVG로.
function CopyIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.2" />
      <path d="M2.5 10.5v-8A1 1 0 0 1 3.5 1.5h8" />
    </svg>
  )
}

type Props = {
  loggedMovieId: string
  /** 서버에서 이미 만들어진 slug가 있으면 미리 채워서 넘긴다 — 없으면 클라이언트가
   * 클릭 시점에 "있는지 확인"하느라 매번 "만드는 중"이 잠깐 뜬다(ShareButton과
   * 같은 문제였다). */
  initialUrl?: string | null
}

/** 영화 하나를 카드 링크로 공유한다 — 우주 전체 공유와 독립적인 slug(0004)를 쓴다. */
export function ShareCardButton({ loggedMovieId, initialUrl = null }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
      return
    }

    setLoading(true)
    try {
      const slug = await getOrCreateMovieCardSlug(loggedMovieId)
      const newUrl = `${window.location.origin}/m/${slug}`
      setUrl(newUrl)
      await navigator.clipboard.writeText(newUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } finally {
      setLoading(false)
    }
  }

  if (url) {
    return (
      <button type="button" onClick={handleClick} className={actionClass}>
        <CopyIcon />
        {copied ? '복사됨' : '카드 링크 복사'}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={`${actionClass} disabled:text-white/20`}>
      {loading ? '만드는 중' : '영화 카드 공유'}
    </button>
  )
}
