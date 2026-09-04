'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type MotionValue } from 'framer-motion'
import type { Movie } from '@/data/movies'
import { DURATION, EASE_SLOW } from '@/lib/motion'
import { MIN_RADIUS, MAX_RADIUS, clampRadius, gravityForRadius } from '@/lib/universeLayout'
import { MoviePeekPanel } from './MoviePeekPanel'

export type Tier = 'core' | 'near' | 'mid' | 'far'

type Props = {
  movie: Movie
  /** 현재 중심 영화. peek 패널에서 이 영화와 movie 사이의 editorial 큐레이터 노트를
   * 찾는 데 쓴다(자기 자신이면 표시하지 않는다). */
  center: Movie
  x: number
  y: number
  tier: Tier
  /** 이 영화와 현재 중심 사이의 중력(0~1). core에는 의미가 없다. */
  gravity: number
  /** editorial connection을 전혀 반영하지 않은 순수 자동 계산 중력 — 드래그로
   * "밀어서" 되돌아갈 수 있는 가장 먼 한계를 정한다. core에는 의미가 없다. */
  naturalGravity: number
  driftSeed: number
  /** 현재 우주의 확대 배율(1 = 기본). 멀리 있는 영화일수록 더 확대해야 정보가 드러난다. */
  zoomScale: MotionValue<number>
  /** 지금 이 영화가 열람(peek) 상태인지 — 클릭 한 번으로 열리고, 우주를 재배치하지 않는다. */
  peeked: boolean
  /** true면 peek 패널에서 "다시 본 감상 남기기"/"정보 수정"이 가능해진다(로그인한 본인 아카이브에서만). */
  editable?: boolean
  /** 이미 만들어진 영화 카드 공유 URL(서버에서 미리 조회). ShareCardButton의 initialUrl로 전달된다. */
  initialCardUrl?: string | null
  /** 위성(비-core) 영화에만 전달된다 — peek 패널의 "이 영화를 중심으로"에서만 호출된다. */
  onSelect?: (movieId: string) => void
  /** 클릭으로 열람을 열고 닫는다 — null이면 닫기. 우주 재배치(onSelect)와는 완전히 별개다. */
  onPeek?: (movieId: string | null) => void
  /** 드래그 중 실시간으로 호출된다(P2-6). 위성에만, editable한 우주에서만 전달된다. */
  onDragStrength?: (movieId: string, strength: number) => void
  /** 드래그를 놓으면 한 번 호출된다 — 이때 실제로 저장한다. */
  onCommitStrength?: (movieId: string, strength: number) => void
  /** 있으면 peek 패널의 평점/메모가 Supabase 대신 이 함수로 로컬 상태에만
   * 반영된다(데모 우주의 게스트 체험용) — editable과 별개다. */
  onGuestMutate?: (movieId: string, mutate: (movie: Movie) => Movie) => void
  /** tmdbId → 이미 기록한 그 영화의 logged_movie id. "정보 수정"에서 중복 저장을
   * 저장 버튼 누르기 전에 미리 막는 데 쓴다. */
  existingByTmdbId?: Record<number, string>
}

// far는 "관계가 약하다"는 신호이지 "안 보여도 된다"는 뜻이 아니다 — 특히 기록이
// 몇 편 안 되는 개인 아카이브에서는 far 하나가 화면에서 사실상 사라지면 유저가
// 방금 기록한 영화를 못 찾는 문제가 생긴다. 최소한 "멀지만 분명히 있다"로 보이게 한다.
//
// 별(추상적인 점) 대신 포스터 자체가 그 영화를 나타낸다 — tier별 크기 차이로
// 관계의 위계를 그대로 표현한다(2:3 포스터 비율 유지).
const TIER_POSTER_SIZE: Record<Tier, { w: number; h: number }> = {
  core: { w: 84, h: 126 },
  near: { w: 64, h: 96 },
  mid: { w: 50, h: 75 },
  far: { w: 40, h: 60 },
}
const TIER_OPACITY: Record<Tier, number> = { core: 1, near: 0.9, mid: 0.65, far: 0.5 }

// 평점(P2-4)은 이제 포스터 앰비언트 글로우의 밝기/크기를 키우는 데 쓴다 — 그
// 영화 고유의 색 위에 금색을 덧씌우면 포스터가 다 달라도 죄다 노랗게 보인다
// (실제로 그랬다). 대신 평점이 높을수록 "그 포스터 자신의 색"이 더 크고 밝게
// 번지게 한다 — 좋아하는 영화일수록 조금 더 빛나되, 색은 여전히 포스터 것이다.
function ratingGlowStrength(rating: number | undefined): number {
  return rating ? Math.min(1, rating / 5) : 0
}

const COOL_RGB = [235, 238, 246] as const
const WARM_RGB = [255, 214, 150] as const

function ratingTintRgb(rating: number | undefined): string {
  const t = rating ? Math.min(1, rating / 5) : 0
  const [r, g, b] = COOL_RGB.map((c, i) => Math.round(c + (WARM_RGB[i] - c) * t))
  return `${r},${g},${b}`
}

export function MovieBody({
  movie,
  center,
  x,
  y,
  tier,
  gravity,
  naturalGravity,
  driftSeed,
  zoomScale,
  peeked,
  editable,
  initialCardUrl,
  onSelect,
  onPeek,
  onDragStrength,
  onCommitStrength,
  onGuestMutate,
  existingByTmdbId,
}: Props) {
  const posterSize = TIER_POSTER_SIZE[tier]
  const isCore = tier === 'core'
  // core(중심 별)도 클릭하면 peek이 열린다 — "이 영화를 중심으로"만 core에게는
  // 의미가 없을 뿐(자기 자신을 다시 중심으로 만들 수는 없다), "다시 봤어"/
  // "정보 수정"은 core에서도 그대로 필요하다.
  const clickable = !!onPeek
  const draggable = !isCore && !!onDragStrength

  // editorial connection 드래그(P2-6): 반지름(거리)만 조절한다 — 각도는 건드리지
  // 않는다. 마우스로만 동작한다(터치는 팬/핀치와 제스처가 겹치므로 건드리지 않는다).
  // 드래그 중에는 위치 레이어의 느린 transition을 꺼서 손가락/커서를 그대로 따라오게 한다.
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<
    | { mode: 'idle' }
    | { mode: 'pending'; startX: number; startY: number }
    | { mode: 'drag'; angle: number; startRadius: number; startX: number; startY: number }
  >({ mode: 'idle' })
  const suppressClickRef = useRef(false)
  const lastStrengthRef = useRef(0)

  // 앞면(포스터)/뒷면(내 평점·메모·액션) 중 뭘 보여줄지 — 열람이 닫히면 다음에
  // 다시 열었을 때 항상 앞면부터 보이도록 리셋한다.
  const [showBack, setShowBack] = useState(false)
  // 포스터 경로는 있는데 실제 로드가 실패하면 브라우저 기본 깨진 이미지 아이콘
  // 대신 그냥 안 보이게 한다 — MoviePeekPanel의 앞면과 같은 이유.
  const [posterFailed, setPosterFailed] = useState(false)

  useEffect(() => {
    if (!peeked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBack(false)
    }
  }, [peeked])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!draggable || e.pointerType !== 'mouse' || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mode: 'pending', startX: e.clientX, startY: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragRef.current
    if (state.mode === 'idle') return

    if (state.mode === 'pending') {
      // 손 떨림 정도의 아주 작은 움직임까지 드래그로 잡아버리면 "클릭했는데
      // 반응이 없다"로 느껴진다 — 열람(클릭)이 실수로 관계 조정(드래그)에
      // 먹히지 않도록 여유를 조금 더 준다.
      if (Math.hypot(e.clientX - state.startX, e.clientY - state.startY) < 10) return
      dragRef.current = {
        mode: 'drag',
        angle: Math.atan2(y, x),
        startRadius: Math.hypot(x, y),
        startX: e.clientX,
        startY: e.clientY,
      }
      suppressClickRef.current = true
      setIsDragging(true)
      return
    }

    const zoom = zoomScale.get() || 1
    const dx = (e.clientX - state.startX) / zoom
    const dy = (e.clientY - state.startY) / zoom
    // 커서가 중심 쪽으로 움직인 만큼(inward)을 반지름에서 뺀다.
    const inward = -(dx * Math.cos(state.angle) + dy * Math.sin(state.angle))
    const naturalRadius = MIN_RADIUS + (1 - naturalGravity) * (MAX_RADIUS - MIN_RADIUS)
    const nextRadius = clampRadius(state.startRadius - inward, MIN_RADIUS, naturalRadius)

    const targetGravity = gravityForRadius(nextRadius)
    const strength = Math.min(1, Math.max(0, targetGravity - naturalGravity))
    lastStrengthRef.current = strength
    onDragStrength?.(movie.id, strength)
  }

  const handlePointerUp = () => {
    if (dragRef.current.mode === 'drag') {
      onCommitStrength?.(movie.id, lastStrengthRef.current)
    }
    dragRef.current = { mode: 'idle' }
    setIsDragging(false)
  }

  // 클릭은 언제나 "열람"이다 — 우주를 재배치하지 않는다. 우주 재배치(onSelect)는
  // peek 패널 안의 "이 영화를 중심으로" 버튼에서만 일어난다. 열람 하나 하려고
  // 우주 전체가 재배치되는 게 이상하다는 지적이 있었다(리뷰 하나 읽자고 클릭했는데
  // 관계도가 통째로 바뀌는 문제) — 그래서 둘을 완전히 분리했다.
  //
  // 이미 열람 중인 별을 다시 클릭하면 닫지 않고 뒤집는다(포스터 ↔ 내 평점/메모) —
  // 닫기는 여백 클릭이나 패널의 "닫기" 버튼이 대신 맡는다.
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!peeked) {
      onPeek?.(movie.id)
      return
    }
    setShowBack((v) => !v)
  }

  // 관계(중력)가 강할수록 궤도가 안정적이다(작은 진폭, 짧은 주기).
  // 관계가 약할수록 멀리서 천천히, 더 크게 흔들린다.
  const driftX = 2 + (1 - gravity) * 11 + (driftSeed % 4)
  const driftY = 2 + (1 - gravity) * 9 + ((driftSeed * 7) % 3)
  const duration = 9 + (1 - gravity) * 14 + (driftSeed % 6)

  // 모든 별이 core처럼 항상 제목/메타/포스터를 다 보여준다 — 줌에 따라 서서히
  // 드러나던 단계적 노출을 없앴다(의도적인 방향 전환. CLAUDE.md 섹션 12/13/P2-5의
  // "멀리서는 점, 가까워지면 드러난다" 원칙과 다른 선택이라는 걸 알고 반영함).
  // 장르는 뺐다 — 평점/메모는 감정을 건드려서 클릭을 유도하는 훅인데, 장르는
  // 그냥 분류 정보라 훅으로서 힘이 없고 좁은 미리보기에 잡음만 늘렸다. 클릭
  // (peek)하면 앞면에서 여전히 보이니 정보 자체가 사라지는 건 아니다.
  const hasDetail = Boolean(movie.rating || movie.note)

  const tierShadow = tier === 'near' ? '0 0 12px 3px rgba(230,234,244,0.12)' : null
  const starShadow = tierShadow ?? 'none'

  const satelliteTint = ratingTintRgb(movie.rating)
  // 평점이 높을수록 포스터 고유 색 글로우가 더 밝고 크게 번진다(색은 그대로 포스터 것).
  const ratingStrength = ratingGlowStrength(movie.rating)
  const glowOpacity = (0.4 + ratingStrength * 0.35) * TIER_OPACITY[tier]
  const glowSpread = 3 + ratingStrength * 6

  return (
    // 위치 레이어: 중심이 바뀌면 모든 영화가 새 좌표로 부드럽게 이동한다(순간이동 없음).
    // peek 패널 내부의 z-10은 "같은 별 안에서만" 유효하다 — 다른 별이 DOM 순서상
    // 나중에 그려지면 그 별의 (안 보이는) 클릭 영역이 이 패널 위를 덮어버려서
    // 커서가 안 바뀌고 클릭도 안 먹는 문제가 생긴다. peek 중인 별 전체를 다른
    // 모든 별보다 위로 올려서 이 문제를 원천적으로 막는다.
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ zIndex: peeked ? 50 : 'auto' }}
      initial={{ x, y }}
      animate={{ x, y }}
      transition={{ duration: isDragging ? 0 : DURATION.approach, ease: EASE_SLOW }}
    >
      {/* 자기 자신의 실제 렌더링 크기 기준으로 중앙정렬한다(-50%,-50%) — 예전엔
          포스터 크기(posterSize)만큼 왼쪽/위로 미는 고정값이었는데, 제목이 길어
          whitespace-nowrap으로 옆으로 늘어나면 실제 내용 폭이 그보다 넓어져서
          중심이 어긋났다. transform의 %는 항상 실제 렌더링 크기를 기준으로 계산돼서
          내용이 얼마나 넓어지든 정확히 중앙에 오게 된다. */}
      <div className="-translate-x-1/2 -translate-y-1/2">
      {/* 흔들림(궤도) 레이어: 위치 이동과 별개로 항상 제자리에서 미세하게 떠 있다. */}
      <motion.div
        className="group relative flex flex-col items-center"
        initial={isCore ? undefined : { x: -driftX, y: -driftY }}
        animate={isCore ? undefined : { x: [-driftX, driftX, -driftX], y: [-driftY, driftY, -driftY] }}
        transition={isCore ? undefined : { duration, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* core와 위성이 항상 같은 종류의 요소(button)를 쓴다 — 그래야 중심이
            바뀔 때 이 요소가 통째로 사라졌다 나타나지 않고, 크기/광채가 그대로
            이어지며 부드럽게 변한다. core도 이제 클릭 가능하다 — peek(열람)은
            중심으로 만들기와 별개라 core에도 그대로 필요하다. */}
        {/* 포스터 자체가 별이다 — 예전엔 추상적인 점 하나가 별이고 그 밑에 따로
            작은 포스터 미리보기가 또 있었는데, 포스터가 늘 보이는 지금은 그게
            같은 정보를 두 번 보여주는 중복이었다. 탭 영역(-m-3 p-3)은 실제
            보이는 포스터보다 넉넉하게 둬서, tier가 작아도(far) 누르기 어렵지 않게 한다. */}
        {/* peek이 열리면 이 버튼 자체가 사라진다 — 대신 MoviePeekPanel의 바깥
            컨테이너가 같은 layoutId를 이어받아서, 포스터가 "그 자리에서 커져서
            카드가 되는" 것처럼 프레이머모션이 자동으로 위치/크기를 보간한다.
            둘이 동시에 떠 있으면 같은 layoutId가 둘이라 애니메이션이 꼬인다. */}
        {!peeked && (
        <motion.button
          type="button"
          data-star=""
          disabled={!clickable}
          onClick={clickable ? handleClick : undefined}
          onPointerDown={draggable ? handlePointerDown : undefined}
          onPointerMove={draggable ? handlePointerMove : undefined}
          onPointerUp={draggable ? handlePointerUp : undefined}
          onPointerCancel={draggable ? handlePointerUp : undefined}
          aria-label={clickable ? `${movie.title} 열람하기` : movie.title}
          className={`relative -m-3 flex select-none items-center justify-center border-0 bg-transparent p-3 ${
            clickable
              ? 'cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-white/40'
              : 'cursor-default'
          }`}
        >
          <motion.span
            layoutId={`star-${movie.id}`}
            className="relative block overflow-visible rounded-sm"
            animate={{ width: posterSize.w, height: posterSize.h }}
            transition={{ duration: DURATION.approach, ease: EASE_SLOW }}
            style={{ boxShadow: starShadow }}
          >
            {/* core 전용 따뜻한 후광 — 포스터 색과 무관하게 항상 은은히 깔려서
                "이게 지금 중심"이라는 신호를 준다(더 크고, 안 흔들리는 것과 더해서). */}
            {isCore && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-8 -z-20 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,214,150,0.28), transparent 70%)',
                  filter: 'blur(18px)',
                }}
              />
            )}
            {movie.posterPath && !posterFailed ? (
              <>
                {/* 앰비언트 글로우 — 포스터를 크게 확대해 흐리게 깐 사본. 대표색을
                    픽셀로 뽑는 건 TMDB가 외부 CDN이라 캔버스로 읽으면 CORS에
                    막히는데(MoviePeekPanel과 같은 제약), CSS blur는 픽셀을 안
                    읽고 그냥 흐리게 "그리기"만 하니 문제없다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -z-10 rounded-sm object-cover blur-xl"
                  style={{ inset: -glowSpread, opacity: glowOpacity }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                  alt=""
                  loading="lazy"
                  onError={() => setPosterFailed(true)}
                  className="relative h-full w-full rounded-sm object-cover"
                  style={{ opacity: TIER_OPACITY[tier] }}
                />
              </>
            ) : (
              <span
                className="block h-full w-full rounded-sm"
                style={{
                  background: isCore
                    ? 'radial-gradient(circle, rgba(255,226,190,0.9), rgba(255,226,190,0.15) 70%)'
                    : `radial-gradient(circle, rgba(${satelliteTint},0.95), rgba(${satelliteTint},0.1) 70%)`,
                  opacity: TIER_OPACITY[tier],
                }}
              />
            )}
          </motion.span>
        </motion.button>
        )}

        <div className="mt-2 text-center">
          {/* peek 패널의 앞면이 제목/연도/감독을 다시 보여주므로, peek 중엔 여기서
              중복으로 안 보여준다. */}
          {!peeked && (
            <>
              {/* 제목이 포스터보다 몇 배는 넓게 한 줄로 쭉 늘어나면, 좁은
                  포스터랑 같은 덩어리처럼 안 보이고 따로 떨어져 보인다 —
                  포스터 폭과 비슷하게 줄바꿈되게 한다(최대 2줄, 그 이상은 자름). */}
              <div className="line-clamp-2 max-w-28 text-[11px] leading-snug tracking-[0.08em] text-white/70">
                {movie.title}
              </div>
              <div className="mt-0.5 max-w-28 truncate text-[9px] tracking-[0.15em] text-white/35">
                {movie.year} · {movie.director}
              </div>
            </>
          )}

          {/* 클릭(peek)이 시작되면 이 수동적인 블록은 숨고, 대신 이력/액션까지
              포함한 MoviePeekPanel이 뜬다 — 둘을 동시에 보여주면 같은 정보가
              두 번 겹쳐 보인다. 포스터는 이제 별 자체라 여기서 다시 안 보여준다. */}
          {!peeked && hasDetail && (
            <div className="pointer-events-none mt-3 flex w-28 flex-col items-center gap-1.5">
              {movie.rating && (
                <div className="text-[9px] tracking-[0.2em] text-white/40">
                  {'★'.repeat(movie.rating)}
                  {'☆'.repeat(5 - movie.rating)}
                </div>
              )}
              {movie.note && (
                // 클릭 안 해도 자연스럽게 드러나는 미리보기라서, 메모가 아무리 길어도
                // 화면을 뒤덮지 않도록 2줄로 자른다 — 전체 메모는 클릭(peek)하면 보인다.
                <div className="line-clamp-2 max-w-28 text-center text-[9px] leading-relaxed tracking-wide text-white/30">
                  {movie.note}
                </div>
              )}
            </div>
          )}

          {/* 화면 중앙에 크게 띄운다 — 우주(줌/팬 transform이 걸린 조상)의 좌표계
              안에 그대로 두면 position:fixed가 뷰포트가 아니라 그 transform
              기준으로 잡혀서 확대/이동할 때 같이 움직여버린다. 포탈로
              document.body에 바로 그려서 그 문제를 피한다 — layoutId 공유
              애니메이션은 포탈을 넘어서도 정상 동작한다(framer-motion이 실제
              화면 좌표를 기준으로 계산하기 때문). */}
          {typeof document !== 'undefined' &&
            createPortal(
              <AnimatePresence>
                {peeked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_SLOW }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
                    onClick={() => onPeek?.(null)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <MoviePeekPanel
                        movie={movie}
                        center={center}
                        editable={!!editable}
                        onGuestMutate={onGuestMutate}
                        existingByTmdbId={existingByTmdbId}
                        initialCardUrl={initialCardUrl}
                        showBack={showBack}
                        onFlip={() => setShowBack((v) => !v)}
                        onClose={() => onPeek?.(null)}
                        onRecenter={onSelect ? () => onSelect(movie.id) : undefined}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
        </div>
      </motion.div>
      </div>
    </motion.div>
  )
}
