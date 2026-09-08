'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import { getOrCreateMovieCardSlug } from '@/lib/movieShareLinks'
import { copyToClipboard } from '@/lib/clipboard'
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
  const [copyFailed, setCopyFailed] = useState(false)

  // 클립보드 복사는 문서가 포커스를 잃은 순간(다른 탭 전환 등) 조용히 실패할
  // 수 있다(lib/clipboard.ts) — 에러를 던지는 대신 "복사됨" 대신 잠깐 실패를
  // 알려주고, url은 이미 만들어져 있으니 다시 누르면 그냥 복사만 재시도한다.
  function markCopyFailed() {
    setCopyFailed(true)
    window.setTimeout(() => setCopyFailed(false), 1800)
  }

  async function handleClick() {
    if (url) {
      if (await copyToClipboard(url)) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
        track('share_movie_card', { action: 'copied' })
      } else {
        markCopyFailed()
      }
      return
    }

    setLoading(true)
    try {
      const { slug, created } = await getOrCreateMovieCardSlug(loggedMovieId)
      const newUrl = `${window.location.origin}/m/${slug}`
      setUrl(newUrl)
      if (await copyToClipboard(newUrl)) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
        track('share_movie_card', { action: created ? 'created' : 'copied' })
      } else {
        markCopyFailed()
      }
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
        title={copyFailed ? t('shareCard.copyFailed') : copied ? t('shareCard.copied') : url ? t('shareCard.copyLink') : t('shareCard.share')}
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
        {copyFailed ? t('shareCard.copyFailed') : copied ? t('shareCard.copied') : t('shareCard.copyLink')}
      </button>
    )
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={`${actionClass} disabled:text-white/20`}>
      {loading ? t('shareCard.creating') : t('shareCard.share')}
    </button>
  )
}
