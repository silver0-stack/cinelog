'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
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
}

// far는 "관계가 약하다"는 신호이지 "안 보여도 된다"는 뜻이 아니다 — 특히 기록이
// 몇 편 안 되는 개인 아카이브에서는 far 하나가 화면에서 사실상 사라지면 유저가
// 방금 기록한 영화를 못 찾는 문제가 생긴다. 최소한 "멀지만 분명히 있다"로 보이게 한다.
const TIER_SIZE: Record<Tier, number> = { core: 22, near: 11, mid: 7, far: 5 }
const TIER_DOT_OPACITY: Record<Tier, number> = { core: 1, near: 0.85, mid: 0.55, far: 0.42 }

// 확대할수록 제목/메타 정보가 서서히 드러난다. 값은 "화면상 실제 크기(px)" 기준이라
// tier마다 다른 배율에서 반응한다 — 가까운 관계(큰 tier)는 적게 확대해도 보이고,
// 먼 관계(작은 tier)는 훨씬 더 확대해야 보인다.
const TITLE_REVEAL_PX = 6
const TITLE_FULL_PX = 9
const META_REVEAL_PX = 20
const META_FULL_PX = 30

// 포스터/장르/한줄메모는 정보 노출의 마지막 단계다(P2-5) — 기본은 여전히 추상적인
// 점이고, 아주 가까이 줌인했을 때(또는 선택해서 core가 됐을 때)만 짧게 드러난다.
const DETAIL_REVEAL_PX = 45
const DETAIL_FULL_PX = 70

// 평점(P2-4): 크기는 이미 관계 강도(tier)를 나타내는 채널이라 겹치면 안 되므로,
// 평점은 별도의 은은한 광채(glow)로만 더한다 — 좋아하는 영화일수록 조금 더 빛난다.
// glow(box-shadow)만으로는 별 자체가 워낙 작아서 차이가 잘 안 보이길래, 별 색
// 자체도 평점만큼 흰색에서 core와 같은 따뜻한 금색 쪽으로 살짝 물들인다.
function ratingGlow(rating: number | undefined): string | null {
  if (!rating) return null
  const t = Math.min(1, rating / 5)
  return `0 0 ${8 + t * 18}px ${1 + t * 3}px rgba(255,214,150,${0.08 + t * 0.22})`
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
}: Props) {
  const size = TIER_SIZE[tier]
  const isCore = tier === 'core'
  // core(중심 별)도 클릭하면 peek이 열린다 — "이 영화를 중심으로"만 core에게는
  // 의미가 없을 뿐(자기 자신을 다시 중심으로 만들 수는 없다), "다시 봤어"/
  // "정보 수정"은 core에서도 그대로 필요하다.
  const clickable = !!onPeek
  const draggable = !isCore && !!onDragStrength
  const showTooltipOnHover = tier === 'mid' || tier === 'far'
  // 모바일 손가락 탭을 고려해 여유를 조금 더 준다 — 별들이 촘촘한 곳에서
  // 이웃 별과 겹치지 않도록 너무 크게 키우지는 않는다.
  const hitSize = Math.max(size + 18, 32)

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

  // peek 패널은 기본적으로 별 아래에 뜨는데, 화면 아래쪽에 있는 별은 패널의
  // 액션 버튼들("다시 봤어", "카드로 공유" 등)이 뷰포트 밖으로 잘려서 아예
  // 누를 수 없게 된다(스크롤도 없는 화면이라 도달할 방법이 없다). peek이
  // 열릴 때 별의 실제 화면 위치를 확인해서, 화면 아래쪽이면 패널을 위로 띄운다.
  const starButtonRef = useRef<HTMLButtonElement>(null)
  const [flipUp, setFlipUp] = useState(false)

  useEffect(() => {
    if (!peeked) return
    const rect = starButtonRef.current?.getBoundingClientRect()
    setFlipUp(Boolean(rect && rect.top > window.innerHeight * 0.42))
  }, [peeked])

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

  // core는 항상 완전히 보여야 한다 — 임계값을 0 근처로 낮춰서 어떤 zoom에서도
  // 항상 다 드러난 것으로 계산되게 한다(위성과 같은 훅 구조를 유지하기 위해).
  const titleOpacity = useTransform(
    zoomScale,
    [(isCore ? 0 : TITLE_REVEAL_PX) / size, (isCore ? 0.001 : TITLE_FULL_PX) / size],
    [0, 1],
    { clamp: true },
  )
  const metaOpacity = useTransform(
    zoomScale,
    [(isCore ? 0 : META_REVEAL_PX) / size, (isCore ? 0.001 : META_FULL_PX) / size],
    [0, 1],
    { clamp: true },
  )
  const detailOpacity = useTransform(
    zoomScale,
    [(isCore ? 0 : DETAIL_REVEAL_PX) / size, (isCore ? 0.001 : DETAIL_FULL_PX) / size],
    [0, 1],
    { clamp: true },
  )
  const hasDetail = Boolean(movie.posterPath || movie.genres.length > 0 || movie.note)

  const tierShadow = isCore
    ? '0 0 40px 10px rgba(255,214,150,0.16)'
    : tier === 'near'
      ? '0 0 12px 3px rgba(230,234,244,0.12)'
      : null
  const glowShadow = ratingGlow(movie.rating)

  const satelliteTint = ratingTintRgb(movie.rating)

  const dotStyle = {
    background: isCore
      ? 'radial-gradient(circle, rgba(255,226,190,0.9), rgba(255,226,190,0.15) 70%)'
      : `radial-gradient(circle, rgba(${satelliteTint},0.95), rgba(${satelliteTint},0.1) 70%)`,
    boxShadow: [tierShadow, glowShadow].filter(Boolean).join(', ') || 'none',
  }

  return (
    // 위치 레이어: 중심이 바뀌면 모든 영화가 새 좌표로 부드럽게 이동한다(순간이동 없음).
    // peek 패널 내부의 z-10은 "같은 별 안에서만" 유효하다 — 다른 별이 DOM 순서상
    // 나중에 그려지면 그 별의 (안 보이는) 클릭 영역이 이 패널 위를 덮어버려서
    // 커서가 안 바뀌고 클릭도 안 먹는 문제가 생긴다. peek 중인 별 전체를 다른
    // 모든 별보다 위로 올려서 이 문제를 원천적으로 막는다.
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ zIndex: peeked ? 50 : 'auto' }}
      initial={{ x, y, marginLeft: -size / 2, marginTop: -size / 2 }}
      animate={{ x, y, marginLeft: -size / 2, marginTop: -size / 2 }}
      transition={{ duration: isDragging ? 0 : DURATION.approach, ease: EASE_SLOW }}
    >
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
        <motion.button
          ref={starButtonRef}
          type="button"
          data-star=""
          disabled={!clickable}
          onClick={clickable ? handleClick : undefined}
          onPointerDown={draggable ? handlePointerDown : undefined}
          onPointerMove={draggable ? handlePointerMove : undefined}
          onPointerUp={draggable ? handlePointerUp : undefined}
          onPointerCancel={draggable ? handlePointerUp : undefined}
          aria-label={clickable ? `${movie.title} 열람하기` : movie.title}
          className={`flex select-none items-center justify-center rounded-full border-0 bg-transparent p-0 ${
            clickable
              ? 'cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-white/40'
              : 'cursor-default'
          }`}
          animate={{ width: hitSize, height: hitSize }}
          transition={{ duration: DURATION.approach, ease: EASE_SLOW }}
        >
          <motion.span
            className="rounded-full"
            animate={{ width: size, height: size, opacity: TIER_DOT_OPACITY[tier] }}
            transition={{ duration: DURATION.approach, ease: EASE_SLOW }}
            style={dotStyle}
          />
        </motion.button>

        <div className="mt-2 text-center">
          <motion.div
            className="whitespace-nowrap text-[11px] tracking-[0.08em] text-white/70"
            style={{ opacity: peeked ? 1 : titleOpacity }}
          >
            {movie.title}
          </motion.div>
          <motion.div
            className="mt-0.5 whitespace-nowrap text-[9px] tracking-[0.15em] text-white/35"
            style={{ opacity: peeked ? 1 : metaOpacity }}
          >
            {movie.year} · {movie.director}
          </motion.div>

          {/* 줌으로 자연스럽게 드러나는 건 "보기"만 한다 — peek(클릭)이 시작되면
              이 수동적인 블록은 숨고, 대신 이력/액션까지 포함한 MoviePeekPanel이
              뜬다. 둘을 동시에 보여주면 같은 정보가 두 번 겹쳐 보인다. */}
          {!peeked && hasDetail && (
            <motion.div
              className="pointer-events-none mt-3 flex w-28 flex-col items-center gap-1.5"
              style={{ opacity: detailOpacity }}
            >
              {movie.posterPath && !posterFailed && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`}
                  alt=""
                  loading="lazy"
                  onError={() => setPosterFailed(true)}
                  className="h-24 w-16 object-cover opacity-70 saturate-[0.65] brightness-[0.82]"
                />
              )}
              {movie.rating && (
                <div className="text-[9px] tracking-[0.2em] text-white/40">
                  {'★'.repeat(movie.rating)}
                  {'☆'.repeat(5 - movie.rating)}
                </div>
              )}
              {movie.genres.length > 0 && (
                <div className="whitespace-nowrap text-[9px] tracking-[0.1em] text-white/30">
                  {movie.genres.join(' · ')}
                </div>
              )}
              {movie.note && (
                // 클릭 안 해도 자연스럽게 드러나는 미리보기라서, 메모가 아무리 길어도
                // 화면을 뒤덮지 않도록 2줄로 자른다 — 전체 메모는 클릭(peek)하면 보인다.
                <div className="line-clamp-2 max-w-28 text-center text-[9px] leading-relaxed tracking-wide text-white/30">
                  {movie.note}
                </div>
              )}
            </motion.div>
          )}

          {peeked && (
            <div
              className={`absolute left-1/2 z-10 -translate-x-1/2 ${flipUp ? 'bottom-full mb-3' : 'top-full mt-3'}`}
            >
              <MoviePeekPanel
                movie={movie}
                center={center}
                editable={!!editable}
                initialCardUrl={initialCardUrl}
                showBack={showBack}
                onFlip={() => setShowBack((v) => !v)}
                onClose={() => onPeek?.(null)}
                onRecenter={onSelect ? () => onSelect(movie.id) : undefined}
              />
            </div>
          )}
        </div>

        {showTooltipOnHover && (
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-black/80 px-1.5 py-0.5 text-[9px] tracking-wide text-white/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100">
            {movie.title}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
