'use client'

import { useState } from 'react'
import { getOrCreateMovieCardSlug } from '@/lib/movieShareLinks'

const actionClass = 'text-[9px] tracking-[0.25em] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'

/** 영화 하나를 카드 링크로 공유한다 — 우주 전체 공유와 독립적인 slug(0004)를 쓴다. */
export function ShareCardButton({ loggedMovieId }: { loggedMovieId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (url) return
    setLoading(true)
    try {
      const slug = await getOrCreateMovieCardSlug(loggedMovieId)
      setUrl(`${window.location.origin}/m/${slug}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (url) {
    return (
      <button type="button" onClick={handleCopy} className={actionClass}>
        {copied ? '복사됨' : '카드 링크 복사'}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleShare} disabled={loading} className={`${actionClass} disabled:text-white/20`}>
      {loading ? '만드는 중' : '카드로 공유'}
    </button>
  )
}
