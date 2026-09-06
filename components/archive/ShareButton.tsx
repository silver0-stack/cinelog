'use client'

import { useState } from 'react'
import { getOrCreateShareSlug } from '@/lib/shareLinks'
import { CopyIcon } from '@/components/icons/CopyIcon'
import { CheckIcon } from '@/components/icons/CheckIcon'
import { navLinkClass } from '@/lib/uiStyles'

// 링크를 복사했다는 건("복사됨") 알지만, 그걸로 뭘 할 수 있는지(공유해서
// 남에게 보여줄 수 있다는 것)까지는 처음엔 안 와닿을 수 있다는 피드백 —
// 처음 복사할 때 딱 한 번만 짧게 알려준다(로컬스토리지로 기억, 매번 뜨면
// 반복돼서 거슬린다).
const SHARE_HINT_KEY = 'cinelog:hint-seen:share-link'

export function ShareButton({ initialUrl = null }: { initialUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHint, setShowHint] = useState(false)

  function markCopied() {
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
    try {
      if (!localStorage.getItem(SHARE_HINT_KEY)) {
        setShowHint(true)
        localStorage.setItem(SHARE_HINT_KEY, '1')
        window.setTimeout(() => setShowHint(false), 3200)
      }
    } catch {
      // 로컬스토리지를 못 쓰는 환경에서는 그냥 힌트 없이 넘어간다.
    }
  }

  // 링크 자체(URL 텍스트)를 라벨로 쓰지 않는다 — 카드 공유(ShareCardButton)와
  // 같은 이유다: 그냥 텍스트로만 있으면 "이미 만들어진 링크를 보여주는 것"인지
  // "눌러야 하는 버튼"인지 구분이 안 됐다. 아이콘 + 고정 라벨로 통일한다.
  async function handleClick() {
    if (url) {
      await navigator.clipboard.writeText(url)
      markCopied()
      return
    }

    setLoading(true)
    try {
      const slug = await getOrCreateShareSlug()
      const newUrl = `${window.location.origin}/u/${slug}`
      setUrl(newUrl)
      await navigator.clipboard.writeText(newUrl)
      markCopied()
    } finally {
      setLoading(false)
    }
  }

  if (url) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1 ${navLinkClass}`}
          aria-label={copied ? '복사됨' : '우주 링크 복사'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span className="hidden sm:inline">{copied ? '복사됨' : '우주 링크 복사'}</span>
        </button>
        {showHint && (
          <p
            className="absolute right-0 top-full mt-2 w-max max-w-[220px] text-right text-[9px] leading-relaxed tracking-wide text-white/40"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }}
          >
            이 링크를 보내서 네 우주를 보여줘봐
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1 ${navLinkClass} disabled:text-white/20`}
    >
      {loading ? '만드는 중' : '우주 공유'}
    </button>
  )
}
