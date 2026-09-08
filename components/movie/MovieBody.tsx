'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion'
import type { Movie } from '@/data/movies'
import { DURATION, EASE_SLOW } from '@/lib/motion'
import { MAX_RADIUS } from '@/lib/universeLayout'
import { MoviePeekPanel } from './MoviePeekPanel'
import { useLocale } from '@/components/i18n/LocaleProvider'

export type Tier = 'near' | 'mid' | 'far'

type Props = {
  movie: Movie
  /** 이 영화와 가장 강하게 연결된 다른 영화(있으면) — peek 패널에서 그 사이의
   * editorial 큐레이터 노트를 찾는 데 쓴다. 관계가 하나도 없으면 undefined. */
  closestMovie?: Movie
  x: number
  y: number
  tier: Tier
  /** 이 영화가 우주 전체에서 가장 강하게 이어진 상대와의 중력(0~1) — 반지름을
   * 정하는 값이다("중심 영화"는 없다, 2026-09-06). */
  gravity: number
  driftSeed: number
  /** 현재 우주의 확대 배율(1 = 기본). 멀리 있는 영화일수록 더 확대해야 정보가 드러난다. */
  zoomScale: MotionValue<number>
  /** 카메라 팬 오프셋(MovieUniverse의 panX/panY). 이 별이 지금 화면 안에 있는지
   * 스스로 계산해서, 화면 밖으로 벗어났을 때 이미지/애니메이션 비용을 아끼는 데 쓴다. */
  panX: MotionValue<number>
  panY: MotionValue<number>
  /** 뷰포트 크기(px) — 화면 밖 판정의 기준. 리사이즈 때만 갱신되는 일반 값이라
   * MotionValue가 아니어도 된다. */
  viewportWidth: number
  viewportHeight: number
  /** 지금 이 영화가 열람(peek) 상태인지 — 클릭 한 번으로 열리고, 우주를 재배치하지 않는다. */
  peeked: boolean
  /** 우주 전체에서 아무 별이든 하나라도 열람 중인지. 열람은 카메라를 그 별로
   * 확대(FOCUS_ZOOM)하는데, 이 확대된 줌 값을 모든 별이 공유해서 참조하다 보니
   * 열람과 무관한 다른 별들까지 "많이 확대됐다"고 착각해 평점/메모 미리보기를
   * 드러내는 부작용이 있었다 — 그걸 막는 데 쓴다. */
  anyPeeked: boolean
  /** "우주 성장 히스토리" 스크럽 중 — 지금 보고 있는 시점에 아직 이 영화를 기록하기
   * 전이면 true. 이 영화의 정체(포스터/제목)를 통째로 가리고, 클릭도 열람도 안
   * 되는 "아직 태어나지 않은 별"로 보여준다 — 정체를 안 가리면 리플레이의 재미
   * (하나씩 켜지는 걸 발견하는 것)가 없다. */
  dimmed?: boolean
  /** "탐색" 패널의 인사이트/장르 필터, 또는 다른 별을 열람 중일 때 그 별의
   * "관련 영화" 하이라이트에서 벗어난 별에 켜진다. dimmed와 달리 정체는 그대로
   * 다 보이고 밝기만 낮아진다 — 이미 다 아는 영화라 굳이 숨길 이유가 없고,
   * 클릭도 계속 된다. 위치 재계산은 절대 하지 않는다. */
  dimmedByHighlight?: boolean
  /** true면 peek 패널에서 "다시 본 감상 남기기"/"정보 수정"이 가능해진다(로그인한 본인 아카이브에서만). */
  editable?: boolean
  /** 이미 만들어진 영화 카드 공유 URL(서버에서 미리 조회). ShareCardButton의 initialUrl로 전달된다. */
  initialCardUrl?: string | null
  /** 클릭으로 열람을 열고 닫는다 — null이면 닫기. */
  onPeek?: (movieId: string | null) => void
  /** 있으면 peek 패널의 평점/메모가 Supabase 대신 이 함수로 로컬 상태에만
   * 반영된다(데모 우주의 게스트 체험용) — editable과 별개다. */
  onGuestMutate?: (movieId: string, mutate: (movie: Movie) => Movie) => void
  /** tmdbId → 이미 기록한 그 영화의 logged_movie id. "정보 수정"에서 중복 저장을
   * 저장 버튼 누르기 전에 미리 막는 데 쓴다. */
  existingByTmdbId?: Record<number, string>
  /** (2026-09-06) 드래그 중 실시간으로 호출된다 — editable한 우주에서만 전달된다.
   * 객관적 메타데이터(감독/장르)로는 못 잡는 개인적인 연결을 유저가 직접 배치로
   * 표현할 수 있게 한다. 마우스로만 동작한다(터치는 팬/핀치와 제스처가 겹친다). */
  onDragPosition?: (movieId: string, x: number, y: number) => void
  /** 드래그를 놓으면 한 번 호출된다 — 이때 실제로 저장한다(그 뒤로 이 영화는
   * 다시는 자동 배치로 안 돌아간다). */
  onCommitPosition?: (movieId: string, x: number, y: number) => void
}

// far는 "관계가 약하다"는 신호이지 "안 보여도 된다"는 뜻이 아니다 — 특히 기록이
// 몇 편 안 되는 개인 아카이브에서는 far 하나가 화면에서 사실상 사라지면 유저가
// 방금 기록한 영화를 못 찾는 문제가 생긴다. 최소한 "멀지만 분명히 있다"로 보이게 한다.
//
// 별(추상적인 점) 대신 포스터 자체가 그 영화를 나타낸다 — tier별 크기 차이로
// 관계의 위계를 그대로 표현한다(2:3 포스터 비율 유지).
const TIER_POSTER_SIZE: Record<Tier, { w: number; h: number }> = {
  near: { w: 64, h: 96 },
  mid: { w: 50, h: 75 },
  far: { w: 40, h: 60 },
}
const TIER_OPACITY: Record<Tier, number> = { near: 0.9, mid: 0.65, far: 0.5 }

// 전체 우주를 멀리서 훑어볼 때(기본 줌 1)는 별이 여러 개 동시에 보여서, 평점·
// 메모까지 다 뜨면 복잡해진다는 피드백 — 그렇다고 아예 숨기면 "눌러보고 싶게
// 만드는 훅"이 사라진다. 그래서 제목/연도/감독은 항상 보이돼(별 자체를 알아보는
// 데 필요한 최소 정보), 평점/메모/다시보기 표시만 이 배율 이상으로 살짝
// 줌인했을 때부터 나타나게 한다 — 설정으로 만드는 대신 줌 자체가 "얼마나
// 자세히 보고 싶은지"를 표현하는 컨트롤이 되게 했다.
const AMBIENT_DETAIL_ZOOM = 1.15

// 줌아웃할수록 위성이 다시 "멀리서는 점처럼 보인다"(CLAUDE.md 섹션 12/13)로
// 수렴하게 만드는 두 구간. 기본 줌(1)에서는 둘 다 벗어나 있어 평소엔 지금처럼
// 포스터+메타가 그대로 보인다. 처음엔 MIN_ZOOM(0.5, 가장 멀리 줌아웃한 지점)
// 바로 위 좁은 구간에만 묶어뒀더니 별이 되는 걸 보려면 최소 줌까지 거의
// 다다라야 해서 체감이 안 됐다 — 완전한 별로 접히는 지점을 MIN_ZOOM보다
// 한참 위(0.65)로 끌어올려서, 살짝만 줌아웃해도 감독/연도가 먼저 옅어지고
// 이어서 포스터가 자기 고유 색의 흐린 빛(이미 있던 앰비언트 글로우 레이어)으로
// 뭉쳐드는 게 바로 느껴지게 했다. zoomScale(스프링으로 보간되는 실시간 값)에서
// 바로 파생하므로 줌인/줌아웃 어느 방향이든 같은 경로를 매끄럽게 되짚는다.
const META_FADE_ZOOM: [number, number] = [0.85, 0.97]
const STAR_FORM_ZOOM: [number, number] = [0.65, 0.85]

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
  closestMovie,
  x,
  y,
  tier,
  gravity,
  driftSeed,
  zoomScale,
  panX,
  panY,
  viewportWidth,
  viewportHeight,
  peeked,
  anyPeeked,
  dimmed,
  dimmedByHighlight,
  editable,
  initialCardUrl,
  onPeek,
  onGuestMutate,
  existingByTmdbId,
  onDragPosition,
  onCommitPosition,
}: Props) {
  const { t } = useLocale()
  const posterSize = TIER_POSTER_SIZE[tier]
  // dimmed(아직 기록 전인 시점으로 스크럽한 별)는 클릭도 드래그도 안 된다 —
  // 아직 우주에 존재하지 않는 것처럼 다뤄야 리플레이가 "발견"으로 느껴진다.
  const clickable = !!onPeek && !dimmed
  const draggable = !!onDragPosition && !dimmed

  // 자유 2D 드래그로 우주 안 자리를 직접 정한다(2026-09-06) — 각도까지 마음대로
  // 옮길 수 있다는 점에서 예전 P2-6(반지름만 조절하던 드래그)과 다르다. 놓는
  // 순간의 좌표를 ref에도 들고 있어야 한다 — onDragPosition으로 매 프레임
  // 부모 state를 갱신해도, pointerup 핸들러 시점에 이 컴포넌트의 x/y prop이
  // 그 최신값으로 리렌더를 이미 마쳤다고 보장할 수 없어서(React 배치/타이밍),
  // 마지막으로 계산한 좌표를 직접 커밋에 써야 안전하다.
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<
    | { mode: 'idle' }
    | { mode: 'pending'; startX: number; startY: number }
    | { mode: 'drag'; startWorldX: number; startWorldY: number; startX: number; startY: number }
  >({ mode: 'idle' })
  const suppressClickRef = useRef(false)
  const lastDragPositionRef = useRef({ x, y })

  // (2026-09-06) 처음엔 onPointerMove/onPointerUp을 별 버튼 자신에게 걸고
  // setPointerCapture로 커서가 버튼 밖으로 나가도 계속 받게 했는데, "마우스로도
  // 대부분 안 된다"는 실사용 피드백으로 드러난 문제였다 — 별의 실제 클릭 영역이
  // 포스터 크기(작으면 40×60px)뿐이라, 조금만 빠르게 끌어도 커서가 그 영역을
  // 벗어나고, setPointerCapture가 모든 브라우저/상황에서 완벽히 되돌려주지
  // 못하면 그 순간 이후 pointermove가 뚝 끊겨 드래그가 조용히 멈췄다. 배경
  // 팬(MovieUniverse)이 이미 쓰고 있는 방식과 똑같이, pointerdown이 일어난
  // 순간부터는 move/up 리스너를 window에 직접 붙인다 — 커서가 어디로 가든
  // (심지어 창 밖으로 나갔다 들어와도) 계속 받을 수 있다.
  const handlePointerDown = (e: React.PointerEvent) => {
    // (2026-09-06) 원래 마우스로만 제한했었다 — "터치는 팬/핀치 제스처와 겹친다"는
    // 이유였는데, 그건 빈 배경에서의 얘기다(MovieUniverse의 배경 팬/핀치 리스너는
    // isOnStar로 별 위에서 시작한 터치를 이미 걸러낸다). 그런데 이 제한이 실제로는
    // 윈도우 정밀 터치패드의 클릭+드래그까지 막아버렸다 — 일부 드라이버/브라우저
    // 조합에서 터치패드 클릭이 pointerType 'mouse'가 아니라 'touch'로 잡힌다.
    // button만 확인하면 충분하다(터치는 항상 button 0).
    if (!draggable || e.button !== 0) return

    const startX = e.clientX
    const startY = e.clientY
    dragRef.current = { mode: 'pending', startX, startY }

    // pointermove와 pointerup 양쪽에서 똑같이 쓴다 — 예전엔 pointerup에서
    // 자신의 좌표를 다시 계산하지 않고 마지막 pointermove가 남긴 값을 그대로
    // 커밋했는데, 브라우저가 마우스를 뗀 그 순간의 최종 이동분을 move가 아니라
    // up 이벤트에 실어 보내는 경우(빠르게 휙 끌고 놓을 때 흔하다) 그 마지막
    // 한 걸음이 통째로 누락돼 "커서 바로 아래"가 아니라 그 전 위치에 뚝
    // 떨어졌다 — 이게 "마우스로 하면 대부분 안 된다"의 실제 원인이었다.
    const applyMove = (clientX: number, clientY: number) => {
      let state = dragRef.current
      if (state.mode === 'idle') return false

      if (state.mode === 'pending') {
        // 손 떨림 정도의 아주 작은 움직임까지 드래그로 잡아버리면 "클릭했는데
        // 반응이 없다"로 느껴진다 — 열람(클릭)이 실수로 드래그에 먹히지 않도록 여유를 준다.
        // (2026-09-08) 10px로는 부족했다 — 많이 줌아웃해서 작아진 별을 조준하려고
        // 마우스를 누른 채 미세하게 위치를 고쳐 잡는 것만으로도 10px를 쉽게
        // 넘어서, 클릭이 조용히 드래그로 먹혀버리고(별이 살짝 밀리기까지 함)
        // 열람은 아예 안 열렸다("클릭이 어떨 땐 되고 어떨 땐 안 된다"는 실사용
        // 피드백의 원인). 진짜 드래그는 보통 이보다 훨씬 크게 움직이므로,
        // 20px로 올려도 의도된 드래그 동작에는 지장이 없다.
        if (Math.hypot(clientX - state.startX, clientY - state.startY) < 20) return false
        // 임계값을 넘긴 바로 이 이동에서 여기서 return해버리면, 한 번에 큰 폭으로
        // 이동하는 입력에서는 이동량이 통째로 버려져 별이 실제로는 전혀 안
        // 움직이는 것처럼 보인다 — 트랜지션만 하고 아래로 흘려보내 이번
        // 이동분도 그대로 반영한다. 기준점은 여전히 pointerdown 시점
        // (state.startX/Y)이어야 델타가 맞는다(이 이동 지점을 기준으로 삼으면 안 된다).
        state = { mode: 'drag', startWorldX: x, startWorldY: y, startX: state.startX, startY: state.startY }
        dragRef.current = state
        suppressClickRef.current = true
        setIsDragging(true)
      }

      const zoom = zoomScale.get() || 1
      const nextX = state.startWorldX + (clientX - state.startX) / zoom
      const nextY = state.startWorldY + (clientY - state.startY) / zoom
      lastDragPositionRef.current = { x: nextX, y: nextY }
      onDragPosition?.(movie.id, nextX, nextY)
      return true
    }

    const handleWindowPointerMove = (ev: PointerEvent) => {
      applyMove(ev.clientX, ev.clientY)
    }

    const endDrag = (ev: PointerEvent) => {
      // pointercancel(드래그 도중 브라우저/OS가 강제로 끊는 것 — 터치패드 삐끗함,
      // 다른 제스처와 충돌 등)은 좌표가 신뢰할 수 없다(브라우저가 0,0을 보내는
      // 경우가 실제로 있다) — 그걸 그대로 델타 계산에 쓰면 별이 화면 좌상단
      // 구석으로 순간이동한다(실제로 겪은 버그). pointerup일 때만 좌표를 반영하고,
      // cancel이면 마지막으로 확인된 좋은 좌표(lastDragPositionRef)를 그대로 커밋한다.
      if (ev.type !== 'pointercancel') {
        applyMove(ev.clientX, ev.clientY)
      }
      if (dragRef.current.mode === 'drag') {
        onCommitPosition?.(movie.id, lastDragPositionRef.current.x, lastDragPositionRef.current.y)
      }
      dragRef.current = { mode: 'idle' }
      setIsDragging(false)
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  // 화면 밖으로 한참 벗어난 별은 이미지 2장(포스터+블러 글로우)과 무한 반복
  // 흔들림 애니메이션을 그릴 이유가 없다 — 기록이 수백 편으로 늘어도 실제로
  // 보이는 별만 이 비용을 쓰게 한다. peeked는 카메라가 항상 그 별을 화면
  // 안으로 데려오므로 계산할 필요 없이 항상 제외한다. 여유(padding)를
  // 넉넉히 둬서 화면 가장자리에서 갑자기 팝인/팝아웃하는 게 보이지 않게 한다.
  const OFFSCREEN_PADDING = 300
  const offscreenDistance = useTransform([panX, panY, zoomScale], (latest) => {
    const [px, py, z] = latest as number[]
    const sx = px + x * z
    const sy = py + y * z
    return Math.max(Math.abs(sx) - viewportWidth / 2 - OFFSCREEN_PADDING, Math.abs(sy) - viewportHeight / 2 - OFFSCREEN_PADDING)
  })
  const [isOffscreen, setIsOffscreen] = useState(false)
  useMotionValueEvent(offscreenDistance, 'change', (d) => {
    const next = d > 0
    setIsOffscreen((prev) => (prev === next ? prev : next))
  })
  const culled = isOffscreen && !peeked

  // 포스터 경로는 있는데 실제 로드가 실패하면 브라우저 기본 깨진 이미지 아이콘
  // 대신 그냥 안 보이게 한다. 실패는 대부분 TMDB CDN에 80장 가까이를 한꺼번에
  // 요청할 때 생기는 일시적인 타임아웃이라(포스터가 실제로 없는 경우가 아니라),
  // 한 번 실패했다고 바로 포기하지 않고 캐시 버스터를 붙여 한 번 더 시도한다 —
  // 이게 없으면 새로고침해야만 다시 뜨는 걸 사용자가 실제로 겪었다(2026-09-08).
  const [posterRetried, setPosterRetried] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const posterSrc = `https://image.tmdb.org/t/p/w154${movie.posterPath}${posterRetried ? '?retry=1' : ''}`

  function handlePosterError() {
    if (posterRetried) {
      setPosterFailed(true)
      return
    }
    setPosterRetried(true)
  }
  // 줌인해도 감상 이력/액션 패널의 글자 크기는 항상 일정하게 유지한다(지도
  // 라이브러리가 마커 라벨에 흔히 쓰는 역스케일 패턴) — 포스터/제목은 줌을
  // 그대로 따라 커지되, 텍스트가 많은 패널까지 커지면 확대할수록 오히려 읽기
  // 어려워진다.
  const inverseZoom = useTransform(zoomScale, (z) => 1 / (z || 1))

  // (2026-09-08) 탭 영역(예전엔 고정 Tailwind -m-3/p-3 = 12px)이 세계 좌표계
  // 전체를 감싸는 부모의 scale(zoom) 변환을 그대로 물려받아서, 많이 줌아웃하면
  // (검색 결과 전체를 담으려 카메라가 zoom을 0.5까지 낮추는 경우 등) 화면상
  // 실제 클릭 영역이 몇 픽셀 수준까지 줄어 거의 안 눌렸다 — 별을 눌러도 우주
  // 여백을 누른 것처럼 처리돼 패널이 안 열리고 검색 결과가 닫혀버리는 버그로
  // 나타났다. inverseZoom으로 padding/margin 자체를 반비례시켜서, 화면에
  // 실제로 그려지는 탭 영역은 항상 일정 크기로 고정되게 한다(포스터 자체는
  // 그대로 줌을 따라 작아져도 된다 — "멀리서는 작은 별처럼 보인다"는 의도는 유지).
  //
  // 처음엔 12px(원래 -m-3/p-3 값)로 맞췄는데, 그정도로는 여전히 안 눌렸다 —
  // STAR_FORM_ZOOM 아래로 줌아웃하면 포스터 자체는 투명해지고 대신 그보다
  // 훨씬 넓게 번지는 흐릿한 글로우(starGlowInset로 바깥까지 확장 + blur로
  // 시각적으로 더 퍼져 보임)가 "별"처럼 보인다 — 사람들은 실제 포스터 박스가
  // 아니라 그 눈에 보이는 글로우 덩어리의 중심을 누르는데, 클릭 판정 영역은
  // 여전히 작은 포스터 기준이라 어긋났다. 글로우가 가장 크게 번지는 경우
  // (glowSpread 최대 9 + 14, 거기에 blur 반경까지)를 넉넉히 덮도록 32px로 올린다.
  //
  // (2026-09-08) 다만 이 32px를 모든 별에 똑같이 주면, 별이 많이 몰린 저줌
  // 상태에서는 어두워진(매칭 안 된) 이웃 별의 확장된 클릭 영역이 바로 옆 밝은
  // 별의 영역을 침범한다 — "어떨 땐 되고 어떨 땐 안 된다"는 실사용 피드백의
  // 원인이었다(옆의 흐린 별이 클릭을 가로챈 것). 지금 찾고 있는(밝은) 별만
  // 넉넉하게 키우고, 어두워진 별은 원래 여유(12px)만 유지해서 서로 침범할
  // 가능성 자체를 줄인다.
  const TAP_TARGET_PADDING = dimmedByHighlight ? 12 : 32
  const tapPadding = useTransform(zoomScale, (z) => TAP_TARGET_PADDING / (z || 1))
  const tapMargin = useTransform(tapPadding, (p) => -p)

  const metaOpacity = useTransform(zoomScale, META_FADE_ZOOM, [0, 1], { clamp: true })
  const starProgress = useTransform(zoomScale, STAR_FORM_ZOOM, [1, 0], { clamp: true })
  const posterOpacity = useTransform(starProgress, (p) => TIER_OPACITY[tier] * (1 - p))

  // AMBIENT_DETAIL_ZOOM을 넘겼는지는 렌더링(JSX 표시 여부)에 쓰이므로 스타일
  // 변환(useTransform)이 아니라 실제 리액트 state가 필요하다 — 줌이 그
  // 기준선을 넘나들 때만 리렌더하도록 구독한다.
  const [showAmbientDetail, setShowAmbientDetail] = useState(() => zoomScale.get() >= AMBIENT_DETAIL_ZOOM)
  useMotionValueEvent(zoomScale, 'change', (latest) => {
    const next = latest >= AMBIENT_DETAIL_ZOOM
    setShowAmbientDetail((prev) => (prev === next ? prev : next))
  })

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

  // 장르는 평소엔 안 보여준다 — 화면에 별이 여러 개일 때 잡음만 는다. 평점/
  // 메모는 감정을 건드려서 클릭을 유도하는 훅인데, 장르는 그냥 분류 정보라
  // 훅으로서 힘이 없고 좁은 미리보기에 잡음만 늘렸다. 클릭(peek)하면 앞면에서
  // 여전히 보이니 정보 자체가 사라지는 건 아니다.
  const hasDetail = Boolean(movie.rating || movie.note)
  // 다시 본 영화는 줌아웃 상태(열람 전)에서도 알 수 있어야 한다는 피드백 —
  // "이 별을 열어봐야만 알 수 있는 정보"이던 걸 미리보기로 끌어올렸다.
  const viewingCount = movie.viewings?.length ?? 0

  const tierShadow = tier === 'near' ? '0 0 12px 3px rgba(230,234,244,0.12)' : null
  const starShadow = tierShadow ?? 'none'

  // 다른 별을 열람 중일 때는 이 별(열람 중인 별 본인만 제외)을 크게 죽여서
  // 화면에서 물러나게 한다 — 배치상 우연히 열람 패널 옆에 겹친 포스터가 그대로
  // 밝게 남아 있으면 시선이 갈라져 패널이 사나워 보인다는 피드백. 클릭은 막지
  // 않는다(dim된 별을 눌러서 그쪽으로 열람을 옮기는 건 여전히 가능해야 한다).
  const focusDimmed = anyPeeked && !peeked
  // 두 종류의 "밝기 낮추기"가 동시에 적용될 수 있어서(열람 포커스 vs 탐색
  // 하이라이트) 곱해서 하나의 값으로 합친다 — 극단적인 경우(둘 다 해당) 아주
  // 어두워지는 건 자연스럽다, 어차피 둘 다 "지금 여기 말고 저기를 봐"라는 뜻이니까.
  const wrapperOpacity = (focusDimmed ? 0.16 : 1) * (dimmedByHighlight ? 0.15 : 1)

  const satelliteTint = ratingTintRgb(movie.rating)
  // 평점이 높을수록 포스터 고유 색 글로우가 더 밝고 크게 번진다(색은 그대로 포스터 것).
  const ratingStrength = ratingGlowStrength(movie.rating)
  const glowOpacity = (0.4 + ratingStrength * 0.35) * TIER_OPACITY[tier]
  const glowSpread = 3 + ratingStrength * 6

  // 포스터가 접히는 동안 그 자리를 대신하는 건 새 레이어가 아니라 원래 있던
  // 앰비언트 글로우 자체다 — 별이 될수록 이 흐린 사본이 더 밝고 크게 번져서
  // "포스터가 자기 색의 빛으로 뭉쳐든" 것처럼 보이게 한다.
  const starGlowOpacity = useTransform(starProgress, (p) => glowOpacity + p * (0.95 - glowOpacity))
  const starGlowInset = useTransform(starProgress, (p) => -(glowSpread + p * 14))
  const starScale = useTransform(starProgress, (p) => 1 - p * 0.35)
  const starRadius = useTransform(starProgress, (p) => `${2 + p * 48}%`)

  // 별끼리 가까이 있으면(특히 far 여러 개가 몰린 자리) 탭 영역(-m-3 p-3)이 서로
  // 겹친다 — 겹친 자리를 클릭했을 때 어느 별이 반응할지가 DOM 순서(=movies 목록
  // 순서, 화면상 위치와 무관)로 정해지면 "분명 이 포스터를 눌렀는데 다른(안 보이는)
  // 별이 열린다"거나 아예 반응이 없는 것처럼 느껴진다. 중심에 가까운(반지름이
  // 작은=관계가 강한) 별이 실제로도 더 크고 앞에 있는 느낌이니, 그 순서대로
  // 겹친 자리의 우선권을 준다 — "가까운 게 먼 걸 가린다"는 자연스러운 규칙.
  const radius = Math.hypot(x, y)
  const proximityZIndex = Math.round(MAX_RADIUS - radius)

  return (
    // 위치 레이어: 배치가 바뀌면(기록 추가/삭제) 모든 영화가 새 좌표로 부드럽게
    // 이동한다(순간이동 없음). peek 패널 내부의 z-10은 "같은 별 안에서만" 유효하다 —
    // 다른 별이 DOM 순서상 나중에 그려지면 그 별의 (안 보이는) 클릭 영역이 이
    // 패널 위를 덮어버려서 커서가 안 바뀌고 클릭도 안 먹는 문제가 생긴다. peek
    // 중인 별 전체를 다른 모든 별보다 위로 올려서 이 문제를 원천적으로 막는다.
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
        className="group relative flex flex-col items-center transition-opacity duration-500 ease-out"
        style={{ opacity: wrapperOpacity }}
        initial={{ x: -driftX, y: -driftY }}
        animate={peeked || culled || dimmed ? undefined : { x: [-driftX, driftX, -driftX], y: [-driftY, driftY, -driftY] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      >
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
          aria-label={clickable ? t(peeked ? 'aria.closeMovie' : 'aria.openMovie', { title: movie.title }) : movie.title}
          className={`relative flex select-none items-center justify-center border-0 bg-transparent ${
            draggable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : clickable ? 'cursor-pointer' : 'cursor-default'
          } ${clickable ? 'focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-white/40' : ''}`}
          style={{ padding: tapPadding, margin: tapMargin }}
        >
          <motion.span
            className="relative block overflow-visible rounded-sm"
            animate={{ width: posterSize.w, height: posterSize.h }}
            transition={{ duration: DURATION.approach, ease: EASE_SLOW }}
            style={{ boxShadow: starShadow, scale: starScale, borderRadius: starRadius }}
          >
            {movie.posterPath && !posterFailed && !culled && !dimmed ? (
              <>
                {/* 앰비언트 글로우 — 포스터를 크게 확대해 흐리게 깐 사본. 대표색을
                    픽셀로 뽑는 건 TMDB가 외부 CDN이라 캔버스로 읽으면 CORS에
                    막히는데(MoviePeekPanel과 같은 제약), CSS blur는 픽셀을 안
                    읽고 그냥 흐리게 "그리기"만 하니 문제없다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img
                  src={posterSrc}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none absolute -z-10 rounded-sm object-cover blur-xl"
                  style={{ inset: starGlowInset, opacity: starGlowOpacity }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* draggable={false} — 안 붙이면 <img>의 브라우저 기본 드래그(OS
                    레벨 "이미지 끌어서 옮기기")가 우리 포인터 드래그보다 먼저
                    끼어든다. 그 순간부터 pointermove가 멈추고 커서가 어디로
                    가든 우리 코드는 못 받다가, 드롭 시점의 엉뚱한 좌표만 잡혀서
                    "포스터로 드래그하면 이상한 자리로 간다"로 보였다 — 제목
                    텍스트(일반 div라 브라우저 기본 드래그 대상이 아님)로 하면
                    멀쩡했던 이유이기도 하다. */}
                <motion.img
                  src={posterSrc}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onError={handlePosterError}
                  className="relative h-full w-full rounded-sm object-cover"
                  style={{ opacity: posterOpacity }}
                />
              </>
            ) : dimmed ? (
              // "아직 태어나지 않은 별" — 평점/포스터 색(satelliteTint)은 이 시점
              // 이후에나 생길 정보라 그대로 쓰면 정체를 흘리게 된다. 그래서 중성적인
              // 흰빛 미광점으로, 평소 fallback보다 훨씬 옅게 보여준다.
              <span
                className="block h-full w-full rounded-sm"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.4), rgba(255,255,255,0.05) 70%)',
                  opacity: 0.22,
                }}
              />
            ) : (
              <span
                className="block h-full w-full rounded-sm"
                style={{
                  background: `radial-gradient(circle, rgba(${satelliteTint},0.95), rgba(${satelliteTint},0.1) 70%)`,
                  opacity: TIER_OPACITY[tier],
                }}
              />
            )}
          </motion.span>
        </motion.button>

        {/* (2026-09-07) data-star/onPointerDown이 포스터 버튼에만 있어서, 제목
            텍스트를 잡고 끌면 "별 위에서 시작한 제스처"로 안 잡혀 배경 팬(전체
            우주 이동)으로 새 버렸다 — 카메라가 통째로 움직이니 다른 별들도 같이
            딸려 움직이는 것처럼 보여서 "드래그하면 다른 영화도 도미노처럼
            움직인다"는 오해를 낳았다(실제로는 위치가 재계산된 게 아니라 화면
            전체가 이동한 것). 포스터와 시각적으로 한 덩어리로 보이는 텍스트도
            같은 드래그 시작점으로 잡는다.
            (2026-09-08) 정작 onClick은 안 걸려 있었다 — 많이 줌아웃하면 포스터는
            투명해지고 제목 글자만 또렷하게 남는데(META_FADE_ZOOM은 연도/감독
            줄에만 걸려있고 제목 자체는 항상 보인다), 실사용자는 흐릿한 포스터
            대신 읽히는 제목을 클릭했다 — 그러면 data-star라 배경 팬(여백 클릭)
            취급은 안 받으면서도 아무 반응이 없어, 검색창만 "바깥 클릭"으로
            닫히고 그 별로는 전혀 줌인이 안 되는 것처럼 보였다. 포스터 버튼과
            똑같은 handleClick을 여기도 연결한다. */}
        <div
          className={`mt-2 text-center ${
            draggable ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : clickable ? 'cursor-pointer' : ''
          }`}
          data-star=""
          onClick={clickable ? handleClick : undefined}
          onPointerDown={draggable ? handlePointerDown : undefined}
        >
          {/* 제목은 열람 여부/줌과 무관하게 항상 보인다 — 더 이상 별도의
              "앞면 카드"가 없으니 여기가 유일한 표시 자리다. 감독/연도만 극단적으로
              줌아웃하면 먼저 옅어진다(META_FADE_ZOOM) — 별을 알아보는 데 꼭
              필요한 최소 정보(제목)는 남기고, 부가 정보부터 접는다. dimmed일 땐
              둘 다 아예 숨긴다 — 아직 기록 전인 영화의 정체를 드러내면 리플레이의
              "발견하는" 재미가 없어진다. */}
          {!dimmed && (
            <>
              <div className="line-clamp-2 max-w-28 text-[11px] leading-snug tracking-[0.08em] text-white/70">
                {movie.title}
              </div>
              <motion.div
                className="mt-0.5 max-w-28 truncate text-[9px] tracking-[0.15em] text-white/35"
                style={{ opacity: metaOpacity }}
              >
                {movie.year} · {movie.director}
              </motion.div>
            </>
          )}

          {/* 장르는 평소엔 안 보여준다 — 화면에 별이 여러 개일 때 잡음만 는다.
              열람 중일 때만, 여유가 생긴 이 순간에만 보여준다. */}
          {peeked && movie.genres.length > 0 && (
            <div className="mt-0.5 max-w-[200px] text-center text-[9px] leading-relaxed tracking-[0.1em] text-white/30">
              {movie.genres.join(' · ')}
            </div>
          )}

          {/* 열람 중이 아닐 때만 보이는 아주 작은 평점/메모/다시보기 미리보기 —
              클릭 없이도 드러나는 훅이다. 포스터 모서리에 마커를 얹었더니 바로
              아래(mt-2) 제목과 겹쳐서 도로 걷어냈다 — 제목 위에 무언가 겹치는
              건 어떤 이유로도 감수할 수 없는 레이아웃이라, 원래대로 별점 옆에
              텍스트로 표시한다. 열람 중엔 아래 패널이 같은 내용을 더 자세히
              보여주므로 중복을 피해 숨긴다.
              제목/연도/감독과 달리 이건 AMBIENT_DETAIL_ZOOM 이상 줌인했을
              때만 보인다 — 전체 우주를 멀리서 훑어볼 땐 별마다 평점/메모까지
              다 뜨면 복잡하다는 피드백. 살짝만 줌인해도(열람할 정도로 가까이
              안 가도) 드러나서 "눌러보고 싶게 만드는 훅" 역할은 그대로 남는다.
              anyPeeked도 함께 본다 — 다른 별을 열람하느라 카메라가 확대된
              경우까지 이 조건을 만족해버리면, 정작 보고 싶은 건 열람한 그
              별 하나인데 화면의 다른 별들까지 죄다 평점/메모를 드러내
              산만해진다(줌 값 자체가 열람 여부와 무관하게 우주 전체가
              공유하는 값이라 생기는 부작용). */}
          {!peeked && !anyPeeked && showAmbientDetail && (hasDetail || viewingCount > 1) && (
            <div className="pointer-events-none mt-3 flex w-28 flex-col items-center gap-1.5">
              {(movie.rating || viewingCount > 1) && (
                <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] text-white/40">
                  {movie.rating && (
                    <span>
                      {'★'.repeat(movie.rating)}
                      {'☆'.repeat(5 - movie.rating)}
                    </span>
                  )}
                  {/* "×N"은 문맥 없이 보면 뭔지 알기 힘들다는 피드백 — "N회"는
                      그 자체로 "N번 봤다"는 뜻이 바로 읽힌다. */}
                  {viewingCount > 1 && <span className="text-white/25">{viewingCount}회</span>}
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
              // 이 패널은 onClick={handleClick}이 걸린 제목 div 안에 DOM상
              // 자식으로 들어가 있다(줌인했을 때 옆에 나란히 뜨는 "beside" 배치라
              // absolute로 그 자리를 벗어나야 해서, 바텀시트처럼 portal로 빼지
              // 않았다). 패널 안의 버튼(편집/공유/다시보기/저장/닫기 등)을
              // 누르면 그 클릭이 그대로 위로 버블링돼 handleClick이 다시
              // 불려서, 방금 누른 버튼의 동작과 무관하게 열람 자체가 곧바로
              // 닫혀버렸다(실사용 버그 — 모든 버튼이 안 먹히는 것처럼 보였다).
              // 여기서 막아야 패널 안의 클릭이 별을 다시 토글하지 않는다.
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoviePeekPanel
                movie={movie}
                closestMovie={closestMovie}
                editable={!!editable}
                onGuestMutate={onGuestMutate}
                existingByTmdbId={existingByTmdbId}
                initialCardUrl={initialCardUrl}
                maxHeightPx={panelMaxHeightPx}
                onClose={() => onPeek?.(null)}
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
                    {/* createPortal은 DOM 위치만 document.body로 옮길 뿐, React
                        합성 이벤트는 실제 DOM 트리가 아니라 React 컴포넌트
                        트리를 따라 버블링한다 — 그래서 이 안에서도 위(beside
                        배치)와 똑같이 onClick={handleClick}이 걸린 제목 div까지
                        클릭이 새어 올라가 열람이 곧바로 닫혔다(모바일 바텀시트에서
                        버튼이 다 안 먹히던 원인). 여기도 동일하게 막는다. */}
                    <div
                      className="pointer-events-auto w-full max-w-[360px]"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MoviePeekPanel
                        movie={movie}
                        closestMovie={closestMovie}
                        editable={!!editable}
                        onGuestMutate={onGuestMutate}
                        existingByTmdbId={existingByTmdbId}
                        initialCardUrl={initialCardUrl}
                        maxHeightPx={panelMaxHeightPx}
                        onClose={() => onPeek?.(null)}
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
