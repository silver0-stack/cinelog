'use client'

import { useState } from 'react'
import { getOrCreateShareSlug } from '@/lib/shareLinks'

const navLinkClass =
  'text-xs font-light tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

export function ShareButton({ initialUrl = null }: { initialUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (url) return
    setLoading(true)
    try {
      const slug = await getOrCreateShareSlug()
      setUrl(`${window.location.origin}/u/${slug}`)
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
      <button type="button" onClick={handleCopy} className={navLinkClass}>
        {copied ? '복사됨' : url.replace(/^https?:\/\//, '')}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleShare} disabled={loading} className={navLinkClass}>
      {loading ? '만드는 중' : '우주 공유'}
    </button>
  )
}
