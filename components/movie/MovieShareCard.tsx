'use client'

import { useState } from 'react'
import { ViewingHistoryTimeline } from './ViewingHistoryTimeline'
import type { Movie } from '@/data/movies'

// 예전엔 포스터(앞면)/평점·메모(뒷면)를 뒤집어서 봤는데, 이 페이지는 링크 하나로
// 남에게 보여주는 공유 페이지라 "뒤집어야 보인다"는 게 오히려 마찰이었다(우주
// 안에서는 이미 학습된 제스처지만, 카톡으로 차갑게 들어온 사람은 뒤집어야
// 한다는 걸 모를 수 있다) — 그래서 포스터/메타정보와 감상을 한 화면에 동시에
// 보여주는 것으로 바꿨다. 넓은 화면은 나란히, 좁은 화면은 위아래로 쌓는다.
// 리뷰 쪽만 높이를 정해두고 그 안에서 스크롤하게 해서(페이지 전체 스크롤 대신)
// 리뷰가 길어도 카드 두 쪽의 세로 길이가 서로 어긋나 보이지 않는다.
export function MovieShareCard({ movie, slug }: { movie: Movie; slug: string }) {
  // 포스터 경로는 있는데 실제 로드가 실패하면(포스터가 내려갔거나 네트워크
  // 오류) 브라우저 기본 깨진 이미지 아이콘 대신 그냥 "포스터 없음"으로 대체한다.
  const [posterFailed, setPosterFailed] = useState(false)
  const viewings = movie.viewings ?? []

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-8 sm:max-w-2xl sm:flex-row sm:items-start sm:justify-center sm:gap-10">
      <div className="flex w-full flex-col items-center gap-4 text-center sm:w-48 sm:shrink-0">
        {movie.posterPath && !posterFailed ? (
          <div className="relative">
            {/* 포스터를 확대·블러한 사본을 뒤에 깔아서 그 영화의 색이 은은하게
                새어나오게 한다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 -z-10 object-cover opacity-35 blur-3xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
              alt=""
              onError={() => setPosterFailed(true)}
              className="relative h-72 w-48 object-cover opacity-80 saturate-[0.7] brightness-[0.85]"
            />
          </div>
        ) : (
          <div className="flex h-72 w-48 items-center justify-center border border-white/10">
            <span className="text-[10px] tracking-[0.2em] text-white/20">포스터 없음</span>
          </div>
        )}

        <div>
          <h1 className="text-base font-light tracking-[0.15em] text-white/90">{movie.title}</h1>
          <p className="mt-1 text-xs font-light tracking-[0.2em] text-white/40">
            {movie.year} · {movie.director}
          </p>
          {movie.genres.length > 0 && (
            <p className="mt-1 text-xs font-light tracking-[0.15em] text-white/30">{movie.genres.join(' · ')}</p>
          )}
        </div>
      </div>

      {viewings.length > 0 && (
        <div className="themed-scroll flex w-full max-w-xs flex-col items-center gap-4 overflow-y-auto rounded-lg border border-white/10 bg-black/40 px-5 py-5 sm:max-h-[60vh] sm:w-72">
          <ViewingHistoryTimeline viewings={viewings} guestEnabled={false} onEditLatest={() => {}} onDeleteLatest={() => {}} />

          <a
            href={`/m/${slug}/download-image`}
            download={`${movie.title}.png`}
            className="mt-1 text-[10px] font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-500 hover:text-white/60"
          >
            이미지 저장
          </a>
        </div>
      )}
    </div>
  )
}
