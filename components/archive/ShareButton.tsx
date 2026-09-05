'use client'

import { useState } from 'react'
import { getOrCreateShareSlug } from '@/lib/shareLinks'
import { CopyIcon } from '@/components/icons/CopyIcon'
import { CheckIcon } from '@/components/icons/CheckIcon'

const navLinkClass =
  'flex items-center gap-1 text-xs font-light tracking-[0.2em] sm:tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// 화면 위쪽을 지나가는 밝은 포스터·글로우 위에서도 글자가 읽혀야 한다는
// 피드백 — MovieUniverse의 idle 힌트와 같은 텍스트 그림자. <button>은 부모의
// text-shadow를 자동으로 물려받지 않는(폼 컨트롤이라 그런) 브라우저 기본
// 동작이 있어서, 감싸는 요소에만 걸어두면 안 먹는다 — 버튼 자신에 직접 건다.
const navTextShadow = { textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }

export function ShareButton({ initialUrl = null }: { initialUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // 링크 자체(URL 텍스트)를 라벨로 쓰지 않는다 — 카드 공유(ShareCardButton)와
  // 같은 이유다: 그냥 텍스트로만 있으면 "이미 만들어진 링크를 보여주는 것"인지
  // "눌러야 하는 버튼"인지 구분이 안 됐다. 아이콘 + 고정 라벨로 통일한다.
  async function handleClick() {
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
      return
    }

    setLoading(true)
    try {
      const slug = await getOrCreateShareSlug()
      const newUrl = `${window.location.origin}/u/${slug}`
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
      <button
        type="button"
        onClick={handleClick}
        className={navLinkClass}
        style={navTextShadow}
        aria-label={copied ? '복사됨' : '우주 링크 복사'}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span className="hidden sm:inline">{copied ? '복사됨' : '우주 링크 복사'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${navLinkClass} disabled:text-white/20`}
      style={navTextShadow}
    >
      {loading ? '만드는 중' : '우주 공유'}
    </button>
  )
}
