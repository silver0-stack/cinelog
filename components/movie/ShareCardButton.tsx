'use client'

import { useState } from 'react'
import { getOrCreateMovieCardSlug } from '@/lib/movieShareLinks'
import { CopyIcon } from '@/components/icons/CopyIcon'
import { CheckIcon } from '@/components/icons/CheckIcon'
import { useLocale } from '@/components/i18n/LocaleProvider'

const actionClass = 'flex items-center gap-1 text-[9px] tracking-[var(--tk-25)] text-white/40 outline-none transition-colors duration-500 hover:text-white/70'

type Props = {
  loggedMovieId: string
  /** 서버에서 이미 만들어진 slug가 있으면 미리 채워서 넘긴다 — 없으면 클라이언트가
   * 클릭 시점에 "있는지 확인"하느라 매번 "만드는 중"이 잠깐 뜬다(ShareButton과
   * 같은 문제였다). */
  initialUrl?: string | null
  /** 'icon'이면 아이콘 전용 버튼(텍스트 라벨 없음)이 된다. */
  variant?: 'text' | 'icon'
}

/** 영화 하나를 카드 링크로 공유한다 — 우주 전체 공유와 독립적인 slug(0004)를 쓴다. */
export function ShareCardButton({ loggedMovieId, initialUrl = null, variant = 'text' }: Props) {
  const { t } = useLocale()
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

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={url ? t('shareCard.copyLink') : t('shareCard.share')}
        title={copied ? t('shareCard.copied') : url ? t('shareCard.copyLink') : t('shareCard.share')}
        className="-m-1.5 flex items-center justify-center p-1.5 text-white/50 outline-none transition-colors duration-500 hover:text-white/85 disabled:text-white/20"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    )
  }

  if (url) {
    return (
      <button type="button" onClick={handleClick} className={actionClass}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? t('shareCard.copied') : t('shareCard.copyLink')}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={`${actionClass} disabled:text-white/20`}>
      {loading ? t('shareCard.creating') : t('shareCard.share')}
    </button>
  )
}
