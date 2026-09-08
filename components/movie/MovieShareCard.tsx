'use client'

import { useState } from 'react'
import type { Movie } from '@/data/movies'
import { useLocale } from '@/components/i18n/LocaleProvider'

function ratingDots(rating: number | undefined): string {
  if (rating == null) return ''
  return '●'.repeat(rating) + '○'.repeat(5 - rating)
}

// slug 자체는 공유 URL이라 그대로 노출해도 되지만, 티켓 번호처럼 보이게
// 영문/숫자만 남겨 뒤쪽 6자리만 쓴다 — 매표소에서 찍어준 발권번호 흉내.
function ticketNumber(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return cleaned.slice(-6).padStart(6, '0')
}

const dashedRow = 'border-b border-dashed border-white/15 px-6 py-3.5'

// 영화입장권 한 장의 공개 공유 페이지. 카드/뒤집기 대신 실제 영화표처럼
// 위에서 아래로 이어지는 한 장의 티켓으로 구성한다 — 색이나 장식 없이
// 점선 구분선과 발권번호/점수 같은 "표 정보" 문법만으로 티켓다움을 낸다.
export function MovieShareCard({ movie, slug }: { movie: Movie; slug: string }) {
  const { t } = useLocale()
  // 포스터 경로는 있는데 실제 로드가 실패하면(포스터가 내려갔거나 네트워크
  // 오류) 브라우저 기본 깨진 이미지 아이콘 대신 그냥 "포스터 없음"으로 대체한다.
  const [posterFailed, setPosterFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  // 그냥 <a href download>였을 땐 눌러도 서버가 이미지를 다 그릴 때까지(몇 초)
  // 화면에 아무 반응이 없어서 "멈췄나" 싶게 느껴졌다 — fetch로 직접 받아서
  // blob으로 내려주는 방식으로 바꾸고, 그 사이엔 "만드는 중"을 보여준다.
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/m/${slug}/download-image`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${movie.title}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setSaving(false)
    }
  }
  const viewings = movie.viewings ?? []
  // movie.rating/note는 최신 감상(viewings[0])과 같은 값이라(데이터 모델 규칙),
  // 관람일도 같은 최신 감상의 날짜를 짝지어야 한 줄 안에서 값이 안 어긋난다.
  const latestWatchedAt = viewings[0]?.watchedAt
  const rewatchCount = Math.max(viewings.length - 1, 0)

  return (
    <div className="w-full max-w-sm border border-white/15 bg-black font-mono">
      <div className="flex items-center justify-between border-b border-dashed border-white/20 px-6 py-3">
        <span className="text-[10px] tracking-[var(--tk-50)] text-white/40">{t('ticket.title')}</span>
        <span className="text-[10px] tracking-[0.1em] text-white/30">No.{ticketNumber(slug)}</span>
      </div>

      <div className="flex justify-center border-b border-dashed border-white/20 px-6 py-5">
        {movie.posterPath && !posterFailed ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 -z-10 object-cover opacity-30 blur-3xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt=""
              onError={() => setPosterFailed(true)}
              className="relative h-52 w-36 border border-white/10 object-cover opacity-85 saturate-[0.7] brightness-[0.85]"
            />
          </div>
        ) : (
          <div className="flex h-52 w-36 items-center justify-center border border-white/10">
            <span className="text-[10px] tracking-[var(--tk-20)] text-white/20">{t('ticket.noPoster')}</span>
          </div>
        )}
      </div>

      <div className="border-b border-dashed border-white/20 px-6 py-4 text-center font-sans">
        <h1 className="text-base font-light tracking-[0.12em] text-white/90">{movie.title}</h1>
        <p className="mt-1.5 text-xs font-light tracking-[0.15em] text-white/40">
          {movie.year} · {movie.director}
        </p>
        {movie.genres.length > 0 && (
          <p className="mt-1 text-xs font-light tracking-[var(--tk-10)] text-white/30">
            {movie.genres.map((g) => t(`genre.${g}`)).join(' · ')}
          </p>
        )}
      </div>

      <div className={`flex flex-col gap-2 text-[11px] tracking-[var(--tk-08)] ${dashedRow}`}>
        {latestWatchedAt && (
          <div className="flex items-baseline justify-between text-white/40">
            <span>{t('ticket.watchedAt')}</span>
            <span>{latestWatchedAt}</span>
          </div>
        )}
        {movie.rating != null && (
          <div className="flex items-baseline justify-between text-white/40">
            <span>{t('ticket.rating')}</span>
            <span className="text-sm text-white/60">{ratingDots(movie.rating)}</span>
          </div>
        )}
        {rewatchCount > 0 && (
          <div className="flex items-baseline justify-between text-white/40">
            <span>{t('ticket.rewatch')}</span>
            <span>{t('ticket.rewatchCount', { count: rewatchCount })}</span>
          </div>
        )}
      </div>

      {movie.note && (
        <div className={dashedRow}>
          <p className="whitespace-pre-line font-sans text-[12px] leading-relaxed tracking-wide text-white/50">{movie.note}</p>
        </div>
      )}

      {viewings.length > 1 && (
        <div className={`themed-scroll flex max-h-40 flex-col gap-2.5 overflow-y-auto ${dashedRow}`}>
          <span className="text-[10px] tracking-[var(--tk-30)] text-white/25">{t('ticket.rewatchScroll', { count: rewatchCount })}</span>
          {viewings.slice(1).map((v) => (
            <div key={v.id} className="flex flex-col gap-1 border-t border-white/5 pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex items-baseline justify-between text-[11px] tracking-[0.08em] text-white/35">
                <span>{v.watchedAt}</span>
                {v.rating != null && <span className="text-white/55">{ratingDots(v.rating)}</span>}
              </div>
              {v.note && (
                <p className="whitespace-pre-line font-sans text-[12px] leading-relaxed tracking-wide text-white/45">
                  {v.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-[9px] tracking-[var(--tk-15)] text-white/20">{t('ticket.notRealTicket')}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[10px] tracking-[var(--tk-35)] text-white/30 outline-none transition-colors duration-500 hover:text-white/60 disabled:text-white/15"
        >
          {saving ? t('ticket.savingImage') : t('ticket.saveImage')}
        </button>
      </div>
    </div>
  )
}
