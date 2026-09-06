'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion'
import { movies as staticMovies, type Movie } from '@/data/movies'
import { relatedMovies } from '@/lib/gravity'
import { MIN_RADIUS, MAX_RADIUS, MIN_ZOOM, MAX_ZOOM, clusterAngles, type GroupMode } from '@/lib/universeLayout'
import { firstWatchedAt, updateMoviePosition } from '@/lib/loggedMovies'
import { EASE_SLOW } from '@/lib/motion'
import { useIdleHint } from '@/lib/useIdleHint'
import { MovieBody, type Tier } from '@/components/movie/MovieBody'

const IDLE_HINT_DELAY = 5000
const IDLE_HINT_CYCLE = 4200
// 조작이 없을 때 순서대로 돌아가며 뜨는 힌트. 첫 문장은 조작법, 나머지는 "왜
// 이렇게 배치돼 있는지"(중력/관계) — 처음 온 사람이 화면을 보고도 그 규칙을
// 짐작할 수 없다는 피드백이 있어서 추가했다.
// (2026-09-06) "중심 영화"라는 개념 자체를 없앴다 — 사용자가 직접 써보면서
// "이 영화를 중심으로"를 자연스럽게 찾은 적이 없다는 피드백. 그 액션이 있어야만
// 의미가 생기는 기능이었는데, 서비스의 핵심 루프(기록하면 우주가 자란다)가
// 아니었다. 이제 모든 영화는 "우주 전체에서 가장 강하게 이어진 한 편과의
// 관계"로 스스로 자리를 정한다(lib/gravity.ts의 relatedMovies) — 아무것도
// 안 해도 자동으로 성단을 이룬다.
// 그런데 각도가 골든 앵글(영화 id 순번)로 완전히 무작위라, 반지름만으로는
// "이웃한 두 별이 실제로 관련 있다"가 보장되지 않는다는 피드백이 이어졌다
// (예: 무관한 두 영화가 우연히 붙어 보임). 각도 배정을 사용자가 고른 기준
// (장르/감독/시대)으로 묶는 클러스터 섹터 방식으로 바꿨다(lib/universeLayout.ts의
// clusterAngles) — 두 번째 힌트를 그에 맞게 고쳤다.
const IDLE_HINTS = ['확대해서 둘러봐', '같은 기준으로 묶인 영화일수록 한 방향에 모여', '포스터를 눌러 자세히 봐'] as const
// 이 배열을 이펙트 의존성으로 그대로 쓰면 매 렌더 새 참조가 생겨 리스너가 계속
// 재등록된다 — 모듈 스코프 상수로 고정해서 참조가 항상 같게 유지한다.
const UNIVERSE_IDLE_EVENTS = ['wheel', 'mousedown', 'touchstart'] as const

// (2026-09-06) 0.0016은 트랙패드 핀치처럼 이벤트당 deltaY가 작은 입력에서
// 굼뜨게 느껴진다는 피드백 — Figma 프로토타입과 비교됐다. 마우스 휠(이벤트당
// deltaY가 큼)에서 과하게 튀지 않는 선에서 체감상 확실히 빨라지도록 올린다.
const ZOOM_SPEED = 0.0032
const ZOOM_SPRING = { stiffness: 260, damping: 30, mass: 1 }
// 별을 열람(peek)하면 카메라가 이 배율까지 확대해서 그 별로 다가간다(Figma의
// "오브젝트로 줌인"과 같은 느낌). MAX_ZOOM보다 낮게 둬서, 그 상태에서도
// 사용자가 원하면 손으로 더 확대할 여지를 남긴다.
const FOCUS_ZOOM = 3
// 열람 중인 별의 "관련 영화"를 몇 개까지 밝힐지 — 기록이 아주 많아서 절반
// 가까이가 관련 있는 경우에도, 화면이 "거의 다 밝다"가 되지 않게 상한을 둔다.
const MAX_RELATED_HIGHLIGHT = 8

// (2026-09-06) 같은 클러스터는 서로 관계도 강한 경향이 있어서(예: 같은 감독
// 영화는 장르/시대도 겹치기 쉽다) 반지름까지 비슷해지고, 부채꼴로 각도를
// 나눠도 포스터가 서로 겹쳐 쌓이는 경우가 실사용 데이터에서 나타났다.
//
// 처음엔 일반적인 2D 반발(서로 멀어지는 방향으로 그냥 밀어내기)로 풀었는데,
// 그러면 반지름(중심에서의 거리 = 관계 강도)까지 같이 바뀌어버려서 "가까울
// 수록 관계가 깊다"는 의미 자체가 뭉개졌다 — 결과적으로 다 고만고만한
// 간격으로 균일하게 흩어져 보였다("뭐가 더 가깝고 이런 게 없어 보인다"는
// 피드백). 그래서 각 별을 미는 힘에서 반지름 방향 성분은 버리고 접선(각도)
// 방향 성분만 적용한다 — 매 반복 뒤 원래 반지름으로 다시 정규화해서, 반지름은
// 절대 안 바뀌고 각도만 미세하게 밀려나며 겹침을 푼다.
const MIN_SEPARATION = 100
const RELAX_ITERATIONS = 8

function pushTangential(point: { x: number; y: number }, pushX: number, pushY: number): void {
  const r = Math.hypot(point.x, point.y) || 0.01
  const radialX = point.x / r
  const radialY = point.y / r
  const radialComponent = pushX * radialX + pushY * radialY
  const nextX = point.x + (pushX - radialComponent * radialX)
  const nextY = point.y + (pushY - radialComponent * radialY)
  const nextR = Math.hypot(nextX, nextY) || 0.01
  // 접선 방향으로만 옮긴 뒤 원래 반지름 r로 재정규화한다 — 부동소수 오차가
  // 누적돼도 반지름이 절대 흔들리지 않도록 매번 못박는다.
  point.x = (nextX / nextR) * r
  point.y = (nextY / nextR) * r
}

// (2026-09-06) 드래그로 직접 배치한(locked) 별은 완화 대상에서 제외한다 —
// 유저가 정한 자리는 절대 자동으로 안 밀려야 한다. 다만 다른(자동 배치) 별이
// 그 별과 겹칠 땐 여전히 밀려나야 하므로, locked 여부는 "밀 수 있는지"만
// 가른다 — 장애물로는 계속 참여한다.
function relaxPositions(points: { x: number; y: number; locked?: boolean }[]): void {
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[j].x - points[i].x
        const dy = points[j].y - points[i].y
        const dist = Math.hypot(dx, dy) || 0.01
        if (dist >= MIN_SEPARATION) continue
        const push = (MIN_SEPARATION - dist) / 2
        const ux = dx / dist
        const uy = dy / dist
        if (!points[i].locked) pushTangential(points[i], -ux * push, -uy * push)
        if (!points[j].locked) pushTangential(points[j], ux * push, uy * push)
      }
    }
  }
}

function tierFor(gravity: number): Tier {
  if (gravity >= 0.5) return 'near'
  if (gravity >= 0.22) return 'mid'
  return 'far'
}

// 영화 id에서 만든 고정된 시드 — 정렬 순서가 아니라 영화 자체에 묶여 있어야
// 기록이 늘어도 각 영화가 항상 같은 "궤도의 개성"(흔들림 폭/주기)을 유지한다.
function stableSeed(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997
  return hash
}

type Props = {
  /** 우주를 채울 영화 목록. 생략하면 V1 정적 큐레이션 우주(data/movies.ts)를 쓴다. */
  movies?: Movie[]
  /** true면 peek 패널에서 감상 수정/정보 수정이 가능해진다(로그인한 본인
   * 아카이브에서만) — V1 정적 우주에서는 켜지 않는다. */
  editable?: boolean
  /** true면 몇 초간 조작이 없을 때 아주 옅은 한 줄 힌트가 떴다 사라진다. 처음 온 사람이
   * "이게 뭐지"에서 멈추지 않도록 하는 최소한의 장치 — 조작하자마자 바로 사라진다. */
  showIdleHint?: boolean
  /** loggedMovieId → 이미 만들어진 영화 카드 공유 URL. 서버에서 미리 조회해서
   * 넘기면, ShareCardButton이 클릭 시점에 "있는지 확인"하느라 매번 "만드는 중"이
   * 뜨는 걸 피할 수 있다(ShareButton의 initialUrl과 같은 이유). */
  movieCardUrls?: Record<string, string>
  /** 이 id가 바뀔 때마다 카메라를 그 영화 위치로 팬하고 peek을 연다 — 데모 우주에
   * 실험 삼아 별을 추가했을 때, 그 별이 우주 어디에 자리 잡았는지 몰라 못 찾겠다는
   * 피드백으로 추가했다. 우주 배치 자체는 건드리지 않는다 — "저기 있어"만 보여준다. */
  focusMovieId?: string | null
  /** 있으면 peek 패널의 평점/메모가 Supabase 대신 이 함수로 로컬 상태에만
   * 반영된다(데모 우주의 게스트 체험용) — editable과 별개다. */
  onGuestMutate?: (movieId: string, mutate: (movie: Movie) => Movie) => void
  /** tmdbId → 이미 기록한 그 영화의 logged_movie id. "정보 수정"에서 중복 저장을
   * 저장 버튼 누르기 전에 미리 막는 데 쓴다. */
  existingByTmdbId?: Record<number, string>
  /** "우주 성장 히스토리" 스크럽 값(YYYY-MM-DD) — 있으면 firstWatchedAt이 이
   * 날짜보다 늦은 위성은 dimmed로 렌더링된다. null/undefined면 평소처럼 전부
   * 켜진 상태(ArchiveShell 밖의 데모/공유 우주는 이 prop 자체를 안 넘긴다). */
  historyDate?: string | null
  /** "탐색" 패널에서 인사이트 항목을 눌렀을 때 켜지는 하이라이트 대상 id 목록.
   * 위치는 절대 재계산하지 않는다 — 이 목록에 없는 위성만 어둡게 만든다.
   * null/undefined면 평소처럼 전부 정상 밝기. 열람 중인 별이 있으면 그 별의
   * "관련 영화" 하이라이트가 이 값보다 우선한다(아래 activeHighlightIds 참고). */
  highlightedIds?: Set<string> | null
  /** 우주를 어떤 기준으로 묶어서 배치할지(장르/감독/시대) — 생략하면 '장르'.
   * 반지름(관계 강도)은 그대로 두고 각도만 이 기준의 섹터로 나눈다(lib/universeLayout.ts의
   * clusterAngles) — 같은 기준을 공유하는 영화들이 항상 같은 방향에 모이게 하기 위함. */
  groupMode?: GroupMode
}

export function MovieUniverse({
  movies = staticMovies,
  editable = false,
  showIdleHint = false,
  movieCardUrls,
  focusMovieId,
  onGuestMutate,
  existingByTmdbId,
  historyDate,
  highlightedIds,
  groupMode = 'genre',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // 화면 밖으로 한참 벗어난 별의 렌더링 비용(이미지 2장+blur+무한 흔들림)을
  // MovieBody가 스스로 아끼려면 뷰포트 크기를 알아야 한다 — 기록이 수백 편으로
  // 늘어도 실제로 보이는 별만 그 비용을 쓰게 하기 위함(리사이즈는 드문 이벤트라
  // 그때만 갱신해도 충분하다).
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }))
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const [peekedId, setPeekedId] = useState<string | null>(null)

  // (2026-09-06) 드래그로 직접 배치한 좌표의 실시간 미리보기 — movie.posX/posY에는
  // 이전에 저장된 값이 이미 들어있으므로, 여기 없으면(undefined) 그 값을(그것도
  // 없으면 자동 배치를) 그대로 쓴다. 커밋 후에도 지우지 않는다 — 저장된 값과
  // 같은 값이라 굳이 지울 이유가 없고, 다음 router.refresh 전까지 이 값이
  // "방금 저장한 자리"를 계속 보여주는 유일한 소스다.
  const [positionOverrides, setPositionOverrides] = useState<Map<string, { x: number; y: number }>>(new Map())

  const handleDragPosition = useCallback((movieId: string, x: number, y: number) => {
    setPositionOverrides((prev) => {
      const next = new Map(prev)
      next.set(movieId, { x, y })
      return next
    })
  }, [])

  // 드래그를 놓으면 그 값을 실제로 저장한다 — 이 영화는 그 뒤로 다시는 자동
  // 배치로 안 돌아간다. 실패해도 화면은 이미 미리보기로 반영돼 있으니 조용히
  // 로그만 남기고 사용자 흐름을 막지 않는다.
  const handleCommitPosition = useCallback(
    (movieId: string, x: number, y: number) => {
      if (!editable) return
      updateMoviePosition(movieId, x, y).catch((err) => {
        console.error('별 위치 저장 실패', err)
      })
    },
    [editable],
  )

  // 각 영화의 각도를 groupMode(장르/감독/시대) 섹터로 배정한다 — movies 배열이
  // 들어온 순서(combineLoggedMovies가 "최근 감상순"으로 정렬)와 무관하게
  // movie.id 기준으로만 정렬해서 배정하므로, 감상 날짜만 고쳐도(router.refresh로
  // 서버에서 다시 정렬된 목록을 받으면) 각도가 우르르 바뀌는 일이 없다(실제로
  // 겪은 버그) — 영화가 추가/삭제되거나 클러스터 키(장르 등)가 바뀔 때만 바뀐다.
  const angleByMovieId = useMemo(() => clusterAngles(movies, groupMode), [movies, groupMode])

  const rawZoom = useMotionValue(1)
  const rawPanX = useMotionValue(0)
  const rawPanY = useMotionValue(0)
  const zoom = useSpring(rawZoom, ZOOM_SPRING)
  const panX = useSpring(rawPanX, ZOOM_SPRING)
  const panY = useSpring(rawPanY, ZOOM_SPRING)
  // 별에 포커스하기 직전의 카메라 상태 — 포커스를 빠져나올 때 여기로 되돌아간다.
  // "탐색하다가 잠깐 들여다보고 제자리로 돌아오는" 느낌을 위한 것.
  const cameraSnapshotRef = useRef<{ zoom: number; panX: number; panY: number } | null>(null)

  // 줌/팬으로 원점에서 멀어졌을 때만 "처음으로" 버튼을 보여준다 — 항상 떠 있으면
  // 평소엔 필요 없는 버튼이 화면을 차지한다. +/− 버튼도 검토했지만 Ctrl+휠/핀치로
  // 이미 되는 동작을 버튼으로 중복시키는 거라("게임 HUD" 남발) 뺐다 — 대신
  // "줌만 하고 어디 있는지 잃어버렸을 때 되돌아갈 방법이 없다"는 실제 문제만 푼다.
  const [cameraAway, setCameraAway] = useState(false)
  const checkCameraAway = useCallback(
    () => Math.abs(rawZoom.get() - 1) > 0.02 || Math.abs(rawPanX.get()) > 4 || Math.abs(rawPanY.get()) > 4,
    [rawZoom, rawPanX, rawPanY],
  )
  useMotionValueEvent(rawZoom, 'change', () => setCameraAway(checkCameraAway()))
  useMotionValueEvent(rawPanX, 'change', () => setCameraAway(checkCameraAway()))
  useMotionValueEvent(rawPanY, 'change', () => setCameraAway(checkCameraAway()))

  const resetCamera = useCallback(() => {
    cameraSnapshotRef.current = null
    rawZoom.set(1)
    rawPanX.set(0)
    rawPanY.set(0)
  }, [rawZoom, rawPanX, rawPanY])

  // 열람을 닫으면 peekedId는 그 즉시 null이 되지만, 카메라가 원래 자리로
  // 돌아오는 스프링 전환은 그 뒤로도 한동안(peek 패널 위치 재측정과 같은
  // 600ms 기준) 계속된다. anyPeeked를 peekedId만으로 판단하면 그 사이엔 줌
  // 값이 아직 안 내려가 있어서, 닫자마자 다른 별들의 평점/메모 미리보기가
  // 잠깐 반짝였다 사라진다 — 이걸 useEffect로 뒤늦게 보정하면(렌더 이후에
  // 실행되므로) "닫힘" 상태가 이미 한 프레임 그려진 뒤에야 켜져서 그 찰나의
  // 반짝임 자체를 못 막는다. 그래서 setPeekedId를 부르는 바로 그 자리에서
  // 같은 렌더에 동시에 반영한다 — ref로 "직전까지 열람 중이었는지"를 들고
  // 있어서 이 콜백들의 정체성(useCallback deps)은 그대로 안정적으로 둔다.
  const peekedIdRef = useRef<string | null>(null)
  const peekExitTimerRef = useRef<number | null>(null)
  const [peekExiting, setPeekExiting] = useState(false)

  const setPeeked = useCallback((movieId: string | null) => {
    const wasPeeked = peekedIdRef.current !== null
    peekedIdRef.current = movieId
    if (peekExitTimerRef.current) {
      window.clearTimeout(peekExitTimerRef.current)
      peekExitTimerRef.current = null
    }
    if (movieId === null && wasPeeked) {
      setPeekExiting(true)
      peekExitTimerRef.current = window.setTimeout(() => setPeekExiting(false), 650)
    } else {
      // 같은 값이면 React가 알아서 리렌더를 건너뛴다 — 매번 분기해서 지금
      // peekExiting이 켜져 있는지 굳이 확인할 필요가 없다(그러면 이 콜백이
      // peekExiting을 의존성으로 물게 되어, 아래 배경 pan 리스너 이펙트가
      // peek을 여닫을 때마다 다시 등록되는 부작용이 생긴다).
      setPeekExiting(false)
    }
    setPeekedId(movieId)
  }, [])

  // 클릭은 열람(peek)만 연다 — 우주를 재배치하지 않는다. 같은 별을 다시 클릭하면
  // 닫히고, 다른 별을 클릭하면 그쪽으로 넘어간다.
  const handlePeek = useCallback(
    (movieId: string | null) => {
      setPeeked(movieId)
    },
    [setPeeked],
  )

  // (2026-09-06) 열람 중인 별이 있으면 그 별과 관계 깊은 별들만 밝히고 나머지는
  // 어둡게 한다("관련 영화 강조") — 예전엔 "이 영화를 중심으로"를 눌러야 우주
  // 전체가 재배치되며 관계를 보여줬는데, 그 액션 자체를 없앴다(위 IDLE_HINTS
  // 주석 참고). 대신 클릭 한 번(peek)에 재배치 없이 관계를 드러낸다. 검색/탐색
  // 하이라이트(highlightedIds)보다 우선한다 — 열람은 "지금 이 영화 하나에
  // 집중"하는 더 좁은 컨텍스트라, 이미 켜져 있던 다른 하이라이트를 덮는 게
  // 자연스럽다. 관련 영화가 하나도 없으면(완전히 고립된 영화) 우주 전체를
  // 어둡게 만들 이유가 없어서 하이라이트 자체를 켜지 않는다.
  const activeHighlightIds = useMemo(() => {
    if (peekedId) {
      const peekedMovie = movies.find((m) => m.id === peekedId)
      const related = peekedMovie ? relatedMovies(peekedMovie, movies).slice(0, MAX_RELATED_HIGHLIGHT) : []
      if (related.length === 0) return null
      return new Set([peekedId, ...related.map((r) => r.movie.id)])
    }
    return highlightedIds ?? null
  }, [peekedId, movies, highlightedIds])

  // 각 영화는 "우주 전체에서 가장 강하게 이어진 한 편과의 관계"로 자기 반지름을
  // 정한다(중심 없음, 2026-09-06) — 각도는 angleByMovieId(groupMode 섹터)로,
  // 반지름은 relatedMovies의 1위 값으로. 관계가 하나도 없으면(공통 장르조차
  // 없음) 반지름이 최대가 되어 바깥으로 밀려난다.
  const bodies = useMemo(() => {
    const computed = movies.map((movie) => {
      const related = relatedMovies(movie, movies)
      const gravity = related[0]?.gravity ?? 0
      const closestMovie = related[0]?.movie
      // (2026-09-06) 드래그로 직접 배치한 좌표가 있으면(미리보기 override 우선,
      // 없으면 저장된 movie.posX/posY) 그 자리를 그대로 쓰고 다시는 자동 배치나
      // 겹침 완화 대상이 되지 않는다 — 관계 강도로는 잡을 수 없는 개인적인
      // 연결을 유저가 직접 표현한 결과이기 때문이다.
      const manualPos = positionOverrides.get(movie.id) ?? (movie.posX != null && movie.posY != null ? { x: movie.posX, y: movie.posY } : undefined)
      const angle = angleByMovieId.get(movie.id) ?? 0
      const radius = MIN_RADIUS + (1 - gravity) * (MAX_RADIUS - MIN_RADIUS)
      // "우주 성장 히스토리" 스크럽 — 레이아웃(각도/반지름)은 절대 다시 계산하지
      // 않는다, 지금의 최종 배치 위에서 이 시점에 아직 기록 전인 영화만 dimmed로
      // 표시한다. 지금 열람 중인 별도 예외로 둔다 — 안 그러면 레일을 드래그하다가
      // 열람 패널을 띄워둔 별의 날짜를 지나치는 순간, 패널은 열려 있는데 별
      // 자체는 이름 없는 흐린 점으로 바뀌어버린다(culled가 peeked를 예외로 두는
      // 것과 같은 이유).
      const dimmed = historyDate != null && movie.id !== peekedId && firstWatchedAt(movie) > historyDate
      const dimmedByHighlight = !!activeHighlightIds && !activeHighlightIds.has(movie.id)
      return {
        movie,
        gravity,
        closestMovie,
        relatedCount: related.length,
        tier: tierFor(gravity),
        x: manualPos ? manualPos.x : Math.cos(angle) * radius,
        y: manualPos ? manualPos.y : Math.sin(angle) * radius,
        locked: !!manualPos,
        dimmed,
        dimmedByHighlight,
      }
    })
    relaxPositions(computed)
    return computed
  }, [movies, angleByMovieId, historyDate, peekedId, activeHighlightIds, positionOverrides])

  // 검색/재관람 목록에서 고른 영화는 focusMovieId로 넘어오는데, 부모(ArchiveShell
  // 등)가 이 값을 다시 null로 되돌리지 않는다 — 그래서 이 값 자체는 열람을 닫아도
  // 계속 남아있다. bodies는 peekedId가 바뀔 때마다 새 배열로 다시 만들어지므로
  // (위 useMemo 의존성 참고), "나가기"로 peekedId를 null로 되돌리기만 해도 이
  // 이펙트가 bodies 변경으로 다시 실행돼 같은 focusMovieId를 또 열어버린다 —
  // 줌아웃이 아예 안 되는 것처럼 보이는 원인이었다. 이미 처리한 focusMovieId는
  // 이 ref에 기억해두고, 같은 값이면(닫혔다 다시 열리는 게 아니라 그냥 남아있는
  // 값이면) 무시한다.
  const consumedFocusIdRef = useRef<string | null>(null)

  // focusMovieId가 가리키는 별을 peek한다 — 실제 카메라 이동은 아래 peekedId
  // 이펙트가 맡는다(클릭으로 peek할 때와 같은 경로를 타게 하기 위해).
  useEffect(() => {
    if (!focusMovieId) return
    if (consumedFocusIdRef.current === focusMovieId) return
    // 검색/재관람 목록은 클릭(MovieBody의 clickable=!dimmed 가드)을 거치지
    // 않고 이 경로로 곧장 열람을 연다 — 히스토리 스크럽 중 아직 dimmed인
    // 별까지 이걸로 우회해서 열어버리면(제목 없는 흐린 점 옆에 평점/메모
    // 패널이 뜨는 이상한 모습) "아직 발견 전"이라는 전제가 깨진다. 그래서
    // 여기서도 같은 가드를 한 번 더 본다. setPeekedId를 직접 부르지 않고
    // setPeeked를 거쳐야 peekedIdRef도 같이 갱신된다(안 그러면 열람 종료
    // 깜빡임 방지 로직의 기준 ref가 실제 상태와 어긋난다).
    const targetDimmed = bodies.find((b) => b.movie.id === focusMovieId)?.dimmed
    if (targetDimmed) return
    consumedFocusIdRef.current = focusMovieId
    setPeeked(focusMovieId)
    // /archive?focus=... 로 들어온 경우, 처리하고 나면 주소창에서 지운다 —
    // 안 그러면 새로고침할 때마다 계속 같은 별로 다시 팬된다. 서버 데이터를
    // 다시 조회할 필요는 없는 순수 URL 정리라 router.replace 대신 history API를
    // 직접 쓴다.
    if (window.location.search.includes('focus=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [focusMovieId, bodies, setPeeked])

  // peekedId가 "바뀌는 순간"에만 카메라를 그 별로 pan+zoom한다(Figma의 "오브젝트로
  // 줌인"과 같은 느낌) — 화면 좌표는 pan + world*zoom으로 계산되므로(zoomAt
  // 참고), 그 별을 화면 중앙(world 원점)에 두려면 pan을 -world*zoom으로
  // 맞추면 된다. peek을 닫으면(null) 포커스 진입 전 카메라 상태로 되돌아간다 —
  // "잠깐 들여다보고 제자리로 돌아오는" 느낌을 위한 것.
  //
  // (2026-09-06) 원래 이 effect는 bodies가 바뀔 때마다(의존성에 포함) 다시
  // 실행돼서 peeked 별의 "최신" 위치로 매번 재추적했다 — 드래그로 직접 배치를
  // 추가하면서 실전 버그로 드러났다: 지금 peek 중인 별을 드래그하면, 드래그
  // 한 프레임마다 bodies가 바뀌고 → 이 effect가 다시 돌아 → 카메라가 그 별의
  // "방금 움직인" 새 좌표로 다시 센터링해버려서, 별이 항상 화면 중앙에 붙박인
  // 것처럼 보였다("줌인 상태에서 어떻게 위치를 가늠하냐"는 피드백 — 카메라가
  // 커서를 쫓아다니니 실제로 옮겨지는 걸 확인할 방법이 없었다). 게다가 그 팬
  // 변경이 cameraAway 감지용 useMotionValueEvent를 건드려 재렌더를 유발하고,
  // 다시 bodies가 바뀌고… 하는 식으로 겹치면서 "Maximum update depth
  // exceeded"까지 재현됐다. 이제 peekedId 값 자체가 바뀐 순간에만(진입/이탈)
  // 카메라를 움직인다 — 같은 별을 계속 보고 있는 동안 그 별의 좌표가 바뀌어도
  // (드래그, 자동 배치 재계산 등) 카메라는 따라가지 않는다.
  const prevPeekedIdRef = useRef<string | null>(null)
  useEffect(() => {
    const justChanged = prevPeekedIdRef.current !== peekedId
    prevPeekedIdRef.current = peekedId
    if (!justChanged) return

    if (peekedId) {
      if (!cameraSnapshotRef.current) {
        cameraSnapshotRef.current = { zoom: rawZoom.get(), panX: rawPanX.get(), panY: rawPanY.get() }
      }
      const body = bodies.find((b) => b.movie.id === peekedId)
      if (!body) return
      rawZoom.set(FOCUS_ZOOM)
      rawPanX.set(-body.x * FOCUS_ZOOM)
      rawPanY.set(-body.y * FOCUS_ZOOM)
    } else if (cameraSnapshotRef.current) {
      const snap = cameraSnapshotRef.current
      rawZoom.set(snap.zoom)
      rawPanX.set(snap.panX)
      rawPanY.set(snap.panY)
      cameraSnapshotRef.current = null
    }
  }, [peekedId, bodies, rawZoom, rawPanX, rawPanY])

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
    // pan 제스처가 아예 관여하지 않는다 — 별을 클릭하려던 손이 조금만 떨려도
    // "클릭이 드래그로 씹히는" 것처럼 보이는 걸 막는다.
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
        // pending 단계(임계값 넘기 전)에서도 미리 막아둔다 — 여기서 안 막으면
        // 브라우저가 그 몇 프레임 사이에 이미 네이티브 스크롤을 시작해버려서,
        // pan으로 전환된 뒤 preventDefault를 불러도 늦어 무시된다
        // ("[Intervention] Ignored attempt to cancel a touchmove event
        // with cancelable=false" 경고로 나타남).
        e.preventDefault()
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

  // 별에 포커스한 상태에서는 언제든 Escape로 빠져나올 수 있어야 한다 — 잘못
  // 눌렀을 때를 위한 안전장치. 배경 클릭/터치, 별 재클릭, 고정 "나가기" 버튼과
  // 함께 "빠져나오는 방법"을 여러 개 겹쳐 둔다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handlePeek(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePeek])

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
        {bodies.map(({ movie, gravity, closestMovie, relatedCount, x, y, tier, dimmed, dimmedByHighlight }) => (
          <MovieBody
            key={movie.id}
            movie={movie}
            closestMovie={closestMovie}
            relatedCount={relatedCount}
            x={x}
            y={y}
            tier={tier}
            gravity={gravity}
            driftSeed={stableSeed(movie.id)}
            zoomScale={zoom}
            panX={panX}
            panY={panY}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            peeked={movie.id === peekedId}
            anyPeeked={peekedId !== null || peekExiting}
            dimmed={dimmed}
            dimmedByHighlight={dimmedByHighlight}
            editable={editable}
            initialCardUrl={movieCardUrls?.[movie.id] ?? null}
            onPeek={handlePeek}
            onGuestMutate={onGuestMutate}
            existingByTmdbId={existingByTmdbId}
            onDragPosition={editable ? handleDragPosition : undefined}
            onCommitPosition={editable ? handleCommitPosition : undefined}
          />
        ))}
      </motion.div>

      {/* 별에 포커스된 동안 항상 보이는 나가기 버튼 — 마우스 위치나 키보드와
          무관하게 항상 접근 가능한 탈출구. 배경 클릭/터치, 별 재클릭, Escape와
          더해 "언제든 빠져나올 수 있어야 한다"를 여러 경로로 보장한다.
          열람 중이 아닐 땐 같은 자리에서 "처음으로"로 바뀐다 — 줌/팬으로 원점을
          벗어났을 때만 나타나는 카메라 리셋 버튼(cameraAway 참고). */}
      {peekedId ? (
        <button
          type="button"
          onClick={() => handlePeek(null)}
          className="absolute left-4 top-4 z-[60] text-[10px] tracking-[0.3em] text-white/60 outline-none transition-colors duration-500 hover:text-white/90"
        >
          ← 나가기
        </button>
      ) : (
        cameraAway && (
          <button
            type="button"
            onClick={resetCamera}
            className="absolute left-4 top-4 z-[60] text-[10px] tracking-[0.3em] text-white/60 outline-none transition-colors duration-500 hover:text-white/90"
          >
            처음으로
          </button>
        )
      )}

      {/* historyDate가 있으면(히스토리 스크럽 중) UniverseHistoryRail이 화면
          하단 거의 같은 자리(bottom-6)에 자기 설명 문구를 띄운다 — 이 idle
          힌트(bottom-12)와 위치가 겹쳐서 두 문구가 서로 겹쳐 읽혔다. 히스토리
          모드에서는 이 힌트가 어차피 안 맞는 얘기이기도 해서(줌/클릭 안내인데
          지금은 스크럽 중) 아예 끈다. */}
      {showIdleHint && historyDate == null && (
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
