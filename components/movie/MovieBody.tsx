'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useTransform, type MotionValue } from 'framer-motion'
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

  // 포스터 경로는 있는데 실제 로드가 실패하면 브라우저 기본 깨진 이미지 아이콘
  // 대신 그냥 안 보이게 한다.
  const [posterFailed, setPosterFailed] = useState(false)
  // 줌인해도 감상 이력/액션 패널의 글자 크기는 항상 일정하게 유지한다(지도
  // 라이브러리가 마커 라벨에 흔히 쓰는 역스케일 패턴) — 포스터/제목은 줌을
  // 그대로 따라 커지되, 텍스트가 많은 패널까지 커지면 확대할수록 오히려 읽기
  // 어려워진다.
  const inverseZoom = useTransform(zoomScale, (z) => 1 / (z || 1))

  // 처음엔 "화면 너비 639px 이하 = 좁은 화면"이라는 고정 기준값으로 나눴는데,
  // 그건 "폰이냐 아니냐"만 구분할 뿐 실제로 포스터 오른쪽에 패널(300px)이 들어갈
  // 자리가 있는지는 안 본 것이다 — 태블릿(세로 모드)처럼 폰보다는 넓지만
  // 포스터+300px+여백을 다 담기엔 부족한 화면에서 여전히 잘렸다. 높이 버그 때
  // 배운 것과 같은 교훈: 기기 종류를 짐작하지 말고 실제로 남은 공간을 재야
  // 한다. 그래서 폭도 높이와 똑같이 "포스터+제목/장르 묶음의 실제 화면 좌표"
  // 기준으로 재서, 오른쪽에 패널이 들어갈 만큼 공간이 남는지 직접 계산한다 —
  // 부족하면(태블릿이든 폰이든 상관없이) 포스터 위치와 무관한 하단 바텀시트로
  // 자동 전환한다.
  const peekAnchorRef = useRef<HTMLDivElement>(null)
  const [useBottomSheet, setUseBottomSheet] = useState(false)
  const [panelMaxHeightPx, setPanelMaxHeightPx] = useState<number | null>(null)
  useEffect(() => {
    if (!peeked) return
    const gap = 16
    const bottomMargin = 24
    const panelWidth = 300 // MoviePeekPanel의 w-[min(80vw,300px)]와 맞춰둔 값

    const measure = () => {
      const rect = peekAnchorRef.current?.getBoundingClientRect()
      if (!rect) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const spaceRight = vw - rect.right - gap
      const fitsBeside = spaceRight >= Math.min(panelWidth, vw * 0.8)
      setUseBottomSheet(!fitsBeside)
      setPanelMaxHeightPx(
        fitsBeside ? Math.max(120, vh - rect.top - bottomMargin) : Math.round(vh * 0.55),
      )
    }

    measure()
    // 포커스 카메라의 pan/zoom 스프링이 자리 잡을 때까지(대략 0.6초) 매
    // 프레임 다시 재서, 최종적으로 카메라가 멈춘 자리 기준 값으로 수렴시킨다.
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      measure()
      if (now - start < 600) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
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
  // 이미 열람(포커스) 중인 별을 다시 클릭하면 닫힌다 — 탭하면 카메라가 확대해서
  // 다가가고, 다시 탭하면 원래 보던 곳으로 돌아오는 대칭적인 토글. 여백 클릭/
  // Escape/화면 고정 "나가기" 버튼도 같은 동작(onPeek(null))으로 이어진다 —
  // "언제든 빠져나올 수 있어야 한다"는 요구를 여러 경로로 충족한다.
  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onPeek?.(peeked ? null : movie.id)
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

  // 별끼리 가까이 있으면(특히 far 여러 개가 몰린 자리) 탭 영역(-m-3 p-3)이 서로
  // 겹친다 — 겹친 자리를 클릭했을 때 어느 별이 반응할지가 DOM 순서(=movies 목록
  // 순서, 화면상 위치와 무관)로 정해지면 "분명 이 포스터를 눌렀는데 다른(안 보이는)
  // 별이 열린다"거나 아예 반응이 없는 것처럼 느껴진다. 중심에 가까운(반지름이
  // 작은=관계가 강한) 별이 실제로도 더 크고 앞에 있는 느낌이니, 그 순서대로
  // 겹친 자리의 우선권을 준다 — "가까운 게 먼 걸 가린다"는 자연스러운 규칙.
  const radius = Math.hypot(x, y)
  const proximityZIndex = Math.round(MAX_RADIUS - radius)

  return (
    // 위치 레이어: 중심이 바뀌면 모든 영화가 새 좌표로 부드럽게 이동한다(순간이동 없음).
    // peek 패널 내부의 z-10은 "같은 별 안에서만" 유효하다 — 다른 별이 DOM 순서상
    // 나중에 그려지면 그 별의 (안 보이는) 클릭 영역이 이 패널 위를 덮어버려서
    // 커서가 안 바뀌고 클릭도 안 먹는 문제가 생긴다. peek 중인 별 전체를 다른
    // 모든 별보다 위로 올려서 이 문제를 원천적으로 막는다.
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ zIndex: peeked ? 1000 : proximityZIndex }}
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
        ref={peekAnchorRef}
        className="group relative flex flex-col items-center"
        initial={isCore ? undefined : { x: -driftX, y: -driftY }}
        animate={isCore || peeked ? undefined : { x: [-driftX, driftX, -driftX], y: [-driftY, driftY, -driftY] }}
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
        {/* peek(열람)해도 이 버튼은 사라지지 않는다 — 열람은 이제 별도 카드로
            "바뀌는" 게 아니라 카메라가 이 별로 확대해서 다가가는 것이고, 이
            포스터 자체가 그 확대의 대상이다(MovieUniverse의 focus 이펙트).
            다시 누르면 열람이 닫힌다(대칭적인 토글). */}
        <motion.button
          type="button"
          data-star=""
          disabled={!clickable}
          onClick={clickable ? handleClick : undefined}
          onPointerDown={draggable ? handlePointerDown : undefined}
          onPointerMove={draggable ? handlePointerMove : undefined}
          onPointerUp={draggable ? handlePointerUp : undefined}
          onPointerCancel={draggable ? handlePointerUp : undefined}
          aria-label={clickable ? `${movie.title} ${peeked ? '닫기' : '열람하기'}` : movie.title}
          className={`relative -m-3 flex select-none items-center justify-center border-0 bg-transparent p-3 ${
            clickable
              ? 'cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-white/40'
              : 'cursor-default'
          }`}
        >
          <motion.span
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

        <div className="mt-2 text-center">
          {/* 제목/연도/감독은 열람 여부와 무관하게 항상 보인다 — 더 이상 별도의
              "앞면 카드"가 없으니 여기가 유일한 표시 자리다. */}
          <div className="line-clamp-2 max-w-28 text-[11px] leading-snug tracking-[0.08em] text-white/70">
            {movie.title}
          </div>
          <div className="mt-0.5 max-w-28 truncate text-[9px] tracking-[0.15em] text-white/35">
            {movie.year} · {movie.director}
          </div>

          {/* 장르는 평소엔 안 보여준다 — 화면에 별이 여러 개일 때 잡음만 는다.
              열람 중일 때만, 여유가 생긴 이 순간에만 보여준다. */}
          {peeked && movie.genres.length > 0 && (
            <div className="mt-0.5 max-w-[200px] text-center text-[9px] leading-relaxed tracking-[0.1em] text-white/30">
              {movie.genres.join(' · ')}
            </div>
          )}

          {/* 열람 중이 아닐 때만 보이는 아주 작은 평점/메모 미리보기 — 클릭 없이도
              드러나는 훅이다. 열람 중엔 아래 패널이 같은 내용을 더 자세히 보여주므로
              중복을 피해 숨긴다. */}
          {!peeked && hasDetail && (
            <div className="pointer-events-none mt-3 flex w-28 flex-col items-center gap-1.5">
              {movie.rating && (
                <div className="text-[9px] tracking-[0.2em] text-white/40">
                  {'★'.repeat(movie.rating)}
                  {'☆'.repeat(5 - movie.rating)}
                </div>
              )}
              {movie.note && (
                <div className="line-clamp-2 max-w-28 text-center text-[9px] leading-relaxed tracking-wide text-white/30">
                  {movie.note}
                </div>
              )}
            </div>
          )}

          {/* 열람(포커스) 패널 — 넓은 화면에서는 카메라가 이 별로 확대해서
              다가온 뒤(MovieUniverse의 focus 이펙트) 포스터 오른쪽에 인라인으로
              나타난다. 이 별과 같은 world-space 레이어 안에 있어서 pan/zoom을
              그대로 따라오고, 별도의 위치 추적 코드가 필요 없다. 대신 내용까지
              그대로 커지면 확대할수록 오히려 읽기 어려워지므로 inverseZoom으로
              역스케일해서 화면상 크기를 항상 일정하게 유지한다(지도
              라이브러리의 마커 라벨과 같은 패턴).
              반드시 absolute여야 한다 — 일반 흐름에 두면(이전 버전) 메모가 긴
              감상일 때 이 패널의 높이가 포스터+제목을 담은 세로 묶음의 전체
              높이에 더해지고, 그 묶음 전체를 -50%로 가운데 정렬하다 보니 포스터
              자체가 화면 중심에서 위로 밀려나 버렸다(포스터가 화면 밖으로
              나가버리는 버그). absolute로 빼면 이 패널은 부모의 크기 계산에서
              완전히 제외되어, 포스터는 항상 카메라가 조준한 자리에 그대로 있다. */}
          {peeked && !useBottomSheet && (
            <motion.div
              className="pointer-events-auto absolute"
              style={{ left: '100%', top: 0, marginLeft: 16, scale: inverseZoom, transformOrigin: 'top left' }}
            >
              <MoviePeekPanel
                movie={movie}
                center={center}
                editable={!!editable}
                onGuestMutate={onGuestMutate}
                existingByTmdbId={existingByTmdbId}
                initialCardUrl={initialCardUrl}
                maxHeightPx={panelMaxHeightPx}
                onClose={() => onPeek?.(null)}
                onRecenter={onSelect ? () => onSelect(movie.id) : undefined}
              />
            </motion.div>
          )}

          {/* 포스터 오른쪽에 패널(300px)이 들어갈 자리가 안 나오면(폰이든
              세로 모드 태블릿이든) 포스터 위치와 완전히 무관하게, 화면 자체
              하단에 고정된 바텀시트로 띄운다. world-space 레이어(줌/팬이 걸린
              조상) 밖인 document.body로 포탈해야 한다 — 안에 그대로 두면
              position:fixed가 뷰포트가 아니라 그 transform 조상을 기준으로
              계산돼서 확대/이동할 때 같이 움직여버린다(MoviePeekPanel이 예전에
              화면 중앙 팝업이던 시절과 같은 이유). 화면 자체를 기준으로 하니
              포스터가 어디 있든, 얼마나 확대돼 있든 상관없이 반드시 화면 안에
              들어온다 — 그래서 역스케일도 필요 없다(애초에 줌이 안 걸린
              레이어에 있으니까).
              애니메이션 없이 그냥 툭 나타나면, 방금 누른 포스터와 화면 하단에
              뜨는 이 패널 사이에 아무 연결이 안 느껴져서 "왜 갑자기 여기에"
              싶은 느낌을 준다 — 아래에서 밀고 올라오는 움직임 자체가 "방금 한
              행동 때문에 이게 나타났다"는 인과관계를 채워준다. AnimatePresence는
              항상 포탈해둬야 조건이 꺼질 때도 exit 애니메이션이 재생된다(조건부로
              포탈 자체를 안 하면 그냥 즉시 사라진다). */}
          {typeof document !== 'undefined' &&
            createPortal(
              <AnimatePresence>
                {peeked && useBottomSheet && (
                  <motion.div
                    key="bottom-sheet"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE_SLOW }}
                    className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center px-4 pb-4"
                  >
                    <div className="pointer-events-auto w-full max-w-[360px]">
                      <MoviePeekPanel
                        movie={movie}
                        center={center}
                        editable={!!editable}
                        onGuestMutate={onGuestMutate}
                        existingByTmdbId={existingByTmdbId}
                        initialCardUrl={initialCardUrl}
                        maxHeightPx={panelMaxHeightPx}
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
