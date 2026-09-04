'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { movies as staticMovies, type Movie } from '@/data/movies'
import { calculateMovieGravity } from '@/lib/gravity'
import { MIN_RADIUS, MAX_RADIUS } from '@/lib/universeLayout'
import { orderPair, upsertEditorialConnection } from '@/lib/editorialConnections'
import { EASE_SLOW } from '@/lib/motion'
import { useIdleHint } from '@/lib/useIdleHint'
import { MovieBody, type Tier } from '@/components/movie/MovieBody'

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180)
const IDLE_HINT_DELAY = 5000
const IDLE_HINT_CYCLE = 4200
// 조작이 없을 때 순서대로 돌아가며 뜨는 힌트. 첫 문장은 조작법, 나머지는 "왜
// 이렇게 배치돼 있는지"(중력/관계) — 처음 온 사람이 화면을 보고도 그 규칙을
// 짐작할 수 없다는 피드백이 있어서 추가했다.
const IDLE_HINTS = ['확대해서 둘러봐', '가까운 별일수록 관계가 깊어', '별을 눌러 다른 영화로 이동해'] as const
// 이 배열을 이펙트 의존성으로 그대로 쓰면 매 렌더 새 참조가 생겨 리스너가 계속
// 재등록된다 — 모듈 스코프 상수로 고정해서 참조가 항상 같게 유지한다.
const UNIVERSE_IDLE_EVENTS = ['wheel', 'mousedown', 'touchstart'] as const

const MIN_ZOOM = 0.5
const MAX_ZOOM = 10
const ZOOM_SPEED = 0.0016
const ZOOM_SPRING = { stiffness: 260, damping: 30, mass: 1 }

function tierFor(gravity: number): Tier {
  if (gravity >= 0.5) return 'near'
  if (gravity >= 0.22) return 'mid'
  return 'far'
}

// 영화 id에서 만든 고정된 시드. 정렬 순서(중심이 바뀔 때마다 달라진다)가 아니라
// 영화 자체에 묶여 있어야, 중심을 옮겨도 같은 영화가 같은 "궤도의 개성"을 유지한다.
function stableSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997
  return hash
}

type Props = {
  /** 우주를 채울 영화 목록. 생략하면 V1 정적 큐레이션 우주(data/movies.ts)를 쓴다. */
  movies?: Movie[]
  /** 처음 들어왔을 때 중심이 되는 영화 id. 생략하면 목록의 첫 번째 영화. */
  defaultCenterId?: string
  /** true면 별을 드래그해서 editorial connection을 조정할 수 있다(P2-6) — V1 정적 우주에서는 켜지 않는다. */
  editable?: boolean
  /** true면 몇 초간 조작이 없을 때 아주 옅은 한 줄 힌트가 떴다 사라진다. 처음 온 사람이
   * "이게 뭐지"에서 멈추지 않도록 하는 최소한의 장치 — 조작하자마자 바로 사라진다. */
  showIdleHint?: boolean
  /** loggedMovieId → 이미 만들어진 영화 카드 공유 URL. 서버에서 미리 조회해서
   * 넘기면, ShareCardButton이 클릭 시점에 "있는지 확인"하느라 매번 "만드는 중"이
   * 뜨는 걸 피할 수 있다(ShareButton의 initialUrl과 같은 이유). */
  movieCardUrls?: Record<string, string>
}

function pairKey(a: string, b: string): string {
  return orderPair(a, b).join(':')
}

export function MovieUniverse({
  movies = staticMovies,
  defaultCenterId,
  editable = false,
  showIdleHint = false,
  movieCardUrls,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [centerId, setCenterId] = useState(defaultCenterId ?? movies[0]?.id ?? '')
  const [peekedId, setPeekedId] = useState<string | null>(null)
  // 드래그로 조정한 관계 강도의 현재 세션 미리보기. movie.editorialConnections에는
  // 이전에 저장된 값이 이미 들어있으므로, 여기 없으면(undefined) 그 값을 그대로 쓴다.
  const [strengthOverrides, setStrengthOverrides] = useState<Map<string, number>>(new Map())

  // 각 영화의 각도를 정할 때 쓰는 고정 순번. movies 목록 순서는 렌더링 중
  // 바뀌지 않으므로, 어떤 영화가 중심이든 이 순번은 항상 같다.
  const movieIndex = useMemo(() => new Map(movies.map((movie, index) => [movie.id, index])), [movies])

  const rawZoom = useMotionValue(1)
  const rawPanX = useMotionValue(0)
  const rawPanY = useMotionValue(0)
  const zoom = useSpring(rawZoom, ZOOM_SPRING)
  const panX = useSpring(rawPanX, ZOOM_SPRING)
  const panY = useSpring(rawPanY, ZOOM_SPRING)

  const center = useMemo(() => movies.find((m) => m.id === centerId) ?? movies[0], [movies, centerId])

  // 영화 하나를 선택하면 그 영화가 새로운 중력의 중심이 된다 — 우주 전체가 그
  // 영화를 기준으로 부드럽게 재배치된다. 카메라(팬)도 함께 원점으로 되돌려야
  // 한다 — 그렇지 않으면 영화들만 새 위치로 움직이고 시점은 그대로 멈춰 있어서,
  // 마치 화면이 다른 장면으로 컷 편집된 것처럼 보인다.
  const handleSelect = useCallback((movieId: string) => {
    setCenterId(movieId)
    setPeekedId(null)
    rawPanX.set(0)
    rawPanY.set(0)
  }, [rawPanX, rawPanY])

  // 클릭은 열람(peek)만 연다 — 우주를 재배치하지 않는다. 같은 별을 다시 클릭하면
  // 닫히고, 다른 별을 클릭하면 그쪽으로 넘어간다.
  const handlePeek = useCallback((movieId: string | null) => {
    setPeekedId(movieId)
  }, [])

  // 중심과 위성을 하나의 배열로 합쳐서 동일한 key(movie.id)로 렌더링한다.
  // 이전에는 중심을 별도 슬롯으로 그려서, 중심이 바뀔 때마다 "이전 중심"과
  // "새 중심"이 서로 다른 React 요소로 취급되어 애니메이션 없이 툭 나타나거나
  // 내용만 순간적으로 바뀌었다. 같은 영화가 항상 같은 요소를 유지해야
  // framer-motion이 위치/크기 변화를 실제로 보간해서 "스윽" 이어지게 그린다.
  const bodies = useMemo(() => {
    // 각도는 정렬 순위가 아니라 영화 자체(전체 목록에서의 고정 순번)로 정한다.
    // 예전에는 중력 순으로 정렬한 뒤 그 순위로 각도를 매겨서, 중심이 바뀔 때마다
    // 실제 관계가 거의 안 변한 별들까지 골든 앵글만큼씩 엉뚱하게 재배정됐다 —
    // 그게 "컷 편집처럼 보인다"는 이질감의 원인이었다. 각도를 고정하면 중심이
    // 바뀌어도 각 영화는 대체로 제자리를 지키고, 중력(반지름)만 반응한다.
    const satellites = movies
      .filter((m) => m.id !== center.id)
      .map((movie) => {
        // "밀어서 원래 자리로" 되돌릴 수 있으려면, editorial connection을 아예
        // 무시한 순수 자동 계산값(naturalGravity)이 따로 필요하다 — 드래그가 되돌아갈
        // 수 있는 한계(가장 먼 지점)를 이 값이 정한다.
        const naturalGravity = calculateMovieGravity(
          { ...center, editorialConnections: [] },
          { ...movie, editorialConnections: [] },
        )

        const override = strengthOverrides.get(pairKey(center.id, movie.id))
        const movieForGravity =
          override === undefined
            ? movie
            : {
                ...movie,
                editorialConnections: [
                  ...(movie.editorialConnections ?? []).filter((c) => c.movieId !== center.id),
                  { movieId: center.id, strength: override },
                ],
              }
        const gravity = calculateMovieGravity(center, movieForGravity)

        return { movie, gravity, naturalGravity }
      })
      .map(({ movie, gravity, naturalGravity }) => {
        const angle = movieIndex.get(movie.id)! * GOLDEN_ANGLE
        const radius = MIN_RADIUS + (1 - gravity) * (MAX_RADIUS - MIN_RADIUS)
        return {
          movie,
          gravity,
          naturalGravity,
          tier: tierFor(gravity),
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        }
      })

    return [
      { movie: center, gravity: 1, naturalGravity: 1, tier: 'core' as Tier, x: 0, y: 0 },
      ...satellites,
    ]
  }, [movies, center, movieIndex, strengthOverrides])

  // 드래그 중 실시간 미리보기 — 별이 즉시 새 반지름으로 반응해야 한다.
  const handleDragStrength = useCallback(
    (movieId: string, strength: number) => {
      setStrengthOverrides((prev) => {
        const next = new Map(prev)
        next.set(pairKey(center.id, movieId), strength)
        return next
      })
    },
    [center.id],
  )

  // 드래그를 놓으면 그 값을 실제로 저장한다. 실패해도 화면은 이미 미리보기로
  // 반영돼 있으니 조용히 로그만 남기고 사용자 흐름을 막지 않는다.
  const handleCommitStrength = useCallback(
    (movieId: string, strength: number) => {
      if (!editable) return
      upsertEditorialConnection(center.id, movieId, strength).catch((err) => {
        console.error('editorial connection 저장 실패', err)
      })
    },
    [center.id, editable],
  )

  // Ctrl(또는 트랙패드 핀치) + 휠로 확대/축소한다. 커서가 가리키는 지점을 기준으로
  // 확대되도록 해서, 확대하면서 특정 영화에 실제로 "다가갈" 수 있게 한다.
  // 브라우저 자체의 페이지 확대를 막으려면 React의 합성 이벤트가 아니라
  // 네이티브 리스너를 passive:false로 등록해야 preventDefault가 먹힌다.
  //
  // 모바일에서는 두 손가락 핀치로 같은 방식의 확대/축소를, 한 손가락 드래그로
  // 화면 이동(pan)을 한다. 탭으로 영화를 선택하는 것도 계속 동작해야 하므로,
  // 손가락이 일정 거리 이상 움직이기 전까지는 아무것도 가로채지 않는다 —
  // 그래야 짧은 탭은 그대로 버튼 클릭으로 이어진다.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // 컨테이너 중심 기준 좌표(mx, my)를 고정한 채로 zoomNew까지 확대/축소한다.
    // 그 지점이 화면에서 그대로 보이도록 pan을 함께 보정한다.
    const zoomAt = (mx: number, my: number, zoomNew: number) => {
      const zoomOld = rawZoom.get()
      const panXOld = rawPanX.get()
      const panYOld = rawPanY.get()
      const worldX = (mx - panXOld) / zoomOld
      const worldY = (my - panYOld) / zoomOld

      rawPanX.set(mx - worldX * zoomNew)
      rawPanY.set(my - worldY * zoomNew)
      rawZoom.set(zoomNew)
    }

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()

      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left - rect.width / 2
      const my = e.clientY - rect.top - rect.height / 2

      const factor = Math.exp(-e.deltaY * ZOOM_SPEED)
      const zoomNew = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawZoom.get() * factor))
      zoomAt(mx, my, zoomNew)
    }

    // 데스크톱: 빈 공간을 마우스로 눌러 드래그하면 화면이 이동(pan)한다. 별을
    // 클릭해서 선택하는 것도 계속 동작해야 하므로, 일정 거리 이상 움직이기
    // 전까지는 아무것도 가로채지 않는다 — 짧은 클릭은 그대로 버튼 클릭으로 이어진다.
    const MOUSE_DRAG_THRESHOLD = 6

    // 별(MovieBody의 버튼, data-star로 표시) 위에서 시작한 마우스다운은 이 배경
    // pan 제스처가 아예 관여하지 않는다. 별에는 자기만의 클릭/드래그(editorial
    // connection 조정) 판정이 따로 있는데, 이 배경 리스너까지 같은 마우스다운에
    // 반응해서 우주 전체를 살짝 pan시켜버리면 — 별을 클릭하려던 손이 조금만
    // 떨려도 "클릭이 드래그로 씹히는" 것처럼 보인다. 두 시스템이 같은 입력을
    // 두고 경쟁하지 않도록 배경 쪽에서 아예 양보한다.
    const isOnStar = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[data-star]') !== null

    type MouseGesture =
      | { mode: 'idle' }
      | { mode: 'pending'; startX: number; startY: number }
      | { mode: 'pan'; lastX: number; lastY: number }

    let mouseGesture: MouseGesture = { mode: 'idle' }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || isOnStar(e.target)) return
      // 별이 아닌 빈 여백을 눌렀다 — 열려 있던 peek 패널을 닫는다. 별을 다시
      // 눌러야만 닫히던 걸, 여백 클릭으로도 닫을 수 있게 해달라는 피드백.
      handlePeek(null)
      mouseGesture = { mode: 'pending', startX: e.clientX, startY: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (mouseGesture.mode === 'pending') {
        const dx = e.clientX - mouseGesture.startX
        const dy = e.clientY - mouseGesture.startY
        if (Math.hypot(dx, dy) > MOUSE_DRAG_THRESHOLD) {
          mouseGesture = { mode: 'pan', lastX: e.clientX, lastY: e.clientY }
        }
        return
      }

      if (mouseGesture.mode === 'pan') {
        rawPanX.set(rawPanX.get() + (e.clientX - mouseGesture.lastX))
        rawPanY.set(rawPanY.get() + (e.clientY - mouseGesture.lastY))
        mouseGesture = { mode: 'pan', lastX: e.clientX, lastY: e.clientY }
      }
    }

    const handleMouseUp = () => {
      mouseGesture = { mode: 'idle' }
    }

    const touchDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const touchMid = (a: Touch, b: Touch) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
    const DRAG_THRESHOLD = 8

    type TouchGesture =
      | { mode: 'idle' }
      | { mode: 'pending'; startX: number; startY: number }
      | { mode: 'pan'; lastX: number; lastY: number }
      | { mode: 'pinch'; lastDist: number }

    let gesture: TouchGesture = { mode: 'idle' }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (isOnStar(e.target)) return
        handlePeek(null)
        const t = e.touches[0]
        gesture = { mode: 'pending', startX: t.clientX, startY: t.clientY }
      } else if (e.touches.length === 2) {
        e.preventDefault()
        gesture = { mode: 'pinch', lastDist: touchDist(e.touches[0], e.touches[1]) }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (gesture.mode === 'pending' && e.touches.length === 1) {
        const t = e.touches[0]
        const dx = t.clientX - gesture.startX
        const dy = t.clientY - gesture.startY
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          gesture = { mode: 'pan', lastX: t.clientX, lastY: t.clientY }
        }
        return
      }

      if (gesture.mode === 'pan' && e.touches.length === 1) {
        e.preventDefault()
        const t = e.touches[0]
        rawPanX.set(rawPanX.get() + (t.clientX - gesture.lastX))
        rawPanY.set(rawPanY.get() + (t.clientY - gesture.lastY))
        gesture = { mode: 'pan', lastX: t.clientX, lastY: t.clientY }
        return
      }

      if (gesture.mode === 'pinch' && e.touches.length === 2) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const [t0, t1] = [e.touches[0], e.touches[1]]
        const dist = touchDist(t0, t1)
        const mid = touchMid(t0, t1)
        const factor = dist / gesture.lastDist
        const zoomNew = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawZoom.get() * factor))
        zoomAt(mid.x - rect.left - rect.width / 2, mid.y - rect.top - rect.height / 2, zoomNew)
        gesture = { mode: 'pinch', lastDist: dist }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        gesture = { mode: 'pinch', lastDist: touchDist(e.touches[0], e.touches[1]) }
      } else if (e.touches.length === 1) {
        const t = e.touches[0]
        gesture = { mode: 'pan', lastX: t.clientX, lastY: t.clientY }
      } else {
        gesture = { mode: 'idle' }
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [rawZoom, rawPanX, rawPanY, handlePeek])

  // 몇 초간 아무 조작이 없으면 힌트를 아주 옅게 띄운다. 조작이 시작되는 순간
  // 바로 사라지고, 다시 가만히 있으면 또 뜬다 — 강요가 아니라 옆에서 살짝 건드리는 정도.
  const showHint = useIdleHint(containerRef, showIdleHint, UNIVERSE_IDLE_EVENTS, IDLE_HINT_DELAY)

  // idle이 이어지는 동안 힌트 문장을 순서대로 돌린다 — 조작법 하나만 반복하지 않고
  // "왜 이렇게 배치되는지"까지 차례로 알려준다.
  // showHint가 꺼져도 인덱스는 리셋하지 않는다 — 다음에 다시 idle이 되면 이어서
  // 돌아간다(어차피 opacity가 0이라 안 보이는 동안의 값은 무의미하다).
  const [hintIndex, setHintIndex] = useState(0)
  useEffect(() => {
    if (!showHint) return
    const timer = window.setInterval(() => setHintIndex((i) => (i + 1) % IDLE_HINTS.length), IDLE_HINT_CYCLE)
    return () => window.clearInterval(timer)
  }, [showHint])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden bg-black active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(22,22,28,0.55), rgba(0,0,0,1) 72%)',
        }}
      />

      <motion.div className="absolute inset-0" style={{ x: panX, y: panY, scale: zoom }}>
        {bodies.map(({ movie, gravity, naturalGravity, x, y, tier }) => (
          <MovieBody
            key={movie.id}
            movie={movie}
            center={center}
            x={x}
            y={y}
            tier={tier}
            gravity={gravity}
            naturalGravity={naturalGravity}
            driftSeed={stableSeed(movie.id)}
            zoomScale={zoom}
            peeked={movie.id === peekedId}
            editable={editable}
            initialCardUrl={movieCardUrls?.[movie.id] ?? null}
            onSelect={tier === 'core' ? undefined : handleSelect}
            onPeek={handlePeek}
            onDragStrength={editable && tier !== 'core' ? handleDragStrength : undefined}
            onCommitStrength={editable && tier !== 'core' ? handleCommitStrength : undefined}
          />
        ))}
      </motion.div>

      {showIdleHint && (
        <motion.div
          className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-light tracking-[0.3em] text-white/30"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }}
          animate={{ opacity: showHint ? 1 : 0 }}
          transition={{ duration: 1.6, ease: EASE_SLOW }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={hintIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: EASE_SLOW }}
            >
              {IDLE_HINTS[hintIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
