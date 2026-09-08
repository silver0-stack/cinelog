'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useSpring } from 'framer-motion'
import { movies as staticMovies, type Movie } from '@/data/movies'
import { relatedMovies } from '@/lib/gravity'
import { MIN_RADIUS, MAX_RADIUS, MIN_ZOOM, MAX_ZOOM, clusterAngles } from '@/lib/universeLayout'
import { firstWatchedAt, updateMoviePosition } from '@/lib/loggedMovies'
import {
  createUniverseText,
  deleteUniverseText,
  updateUniverseTextContent,
  updateUniverseTextTransform,
  type UniverseText,
} from '@/lib/universeTexts'
import { EASE_SLOW } from '@/lib/motion'
import { useIdleHint } from '@/lib/useIdleHint'
import { MovieBody, type Tier } from '@/components/movie/MovieBody'
import { TextObject } from '@/components/universe/TextObject'
import { useLocale } from '@/components/i18n/LocaleProvider'
import type { Locale } from '@/lib/i18n/locale'

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
// (예: 무관한 두 영화가 우연히 붙어 보임). 각도 배정을 장르로 묶는 클러스터
// 섹터 방식으로 바꿨다(lib/universeLayout.ts의 clusterAngles) — 두 번째
// 힌트를 그에 맞게 고쳤다. (묶는 기준을 장르/감독/시대 중 고르게 했던 UI는
// 이후 뺐다 — 드래그로 직접 배치하는 기능이 생기면서 자동 배치는 "직접
// 정하기 전 기본값"일 뿐이라, 그 기본값의 기준까지 고민하게 만들 필요가
// 없다는 판단.)
const IDLE_HINTS: Record<Locale, readonly string[]> = {
  ko: ['확대해서 둘러보세요', '같은 기준으로 묶인 영화일수록 한 방향에 모여요', '포스터를 눌러 자세히 보세요'],
  en: ['Zoom in and look around', 'Movies grouped the same way drift toward one direction', 'Click a poster for details'],
}
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
const RELAX_ITERATIONS = 60
// (2026-09-07) 고정된 100px 간격은 tier별 실제 크기(near 64×96 포스터+제목/연도
// 텍스트까지 합치면 세로로 100px을 이미 넘는다)를 반영하지 못해서, near 포스터
// 여럿이 모이면 정확히 겹쳐 보였다. tier별 "반경"(포스터+라벨을 감싸는 대략의
// 반지름)을 따로 두고, 두 별 사이 필요한 간격을 두 tier 반경의 합으로 계산한다.
const TIER_FOOTPRINT: Record<Tier, number> = { near: 78, mid: 60, far: 48 }
const SEPARATION_GAP = 50

// (2026-09-07) 서로 다른 섹터(장르)의 별이 우연히 비슷한 반지름·인접한 각도에
// 배정되면, 접선 방향으로만 밀고 매번 원래 반지름으로 재정규화하는 방식은 "거의
// 같은 원 위에 겹쳐서 시작한" 경우를 잘 못 푼다 — 재정규화가 계속 제자리 근처로
// 끌어당겨서 아주 많은 반복이 필요하다(실사용 데이터에서 60번을 돌려도 남는
// 경우가 있었다). 안쪽으로는 절대 밀리지 않되(관계가 강한 별이 더 멀어 보이면
// 안 되므로), 바깥쪽으로는 필요한 만큼 반지름이 늘어나는 것을 제한적으로
// 허용한다 — "가까울수록 강한 관계"라는 순서는 지키면서, 진짜 막힌 경우에만
// 빠져나갈 통로를 준다.
const OUTWARD_RADIAL_WEIGHT = 0.4

function pushApart(point: { x: number; y: number }, pushX: number, pushY: number): void {
  const r = Math.hypot(point.x, point.y) || 0.01
  const radialX = point.x / r
  const radialY = point.y / r
  const radialComponent = pushX * radialX + pushY * radialY
  const outwardRadial = Math.max(radialComponent, 0) * OUTWARD_RADIAL_WEIGHT
  const tangentialX = pushX - radialComponent * radialX
  const tangentialY = pushY - radialComponent * radialY
  const nextX = point.x + tangentialX
  const nextY = point.y + tangentialY
  const nextR = Math.hypot(nextX, nextY) || 0.01
  // 접선 이동은 기존처럼 반지름을 지킨 채(r로 재정규화) 반영하고, 바깥쪽
  // 성분만 그 위에 별도로 더한다 — 안쪽으로 줄어들 일은 없다.
  point.x = (nextX / nextR) * r + outwardRadial * radialX
  point.y = (nextY / nextR) * r + outwardRadial * radialY
}

// (2026-09-06) 드래그로 직접 배치한 별은 겹침 완화 대상이 아니다 — 유저가 정한
// 자리는 절대 자동으로 안 밀려야 한다.
// (2026-09-07) 이 함수는 이제 수동 배치를 아예 모른다 — 예전엔 여기서 locked
// 여부를 직접 확인해 밀 수 있는지/장애물로 참여하는지를 갈랐는데, 어느 쪽이든
// "N개 중 하나가 계산에서 빠진다"는 사실 자체가 나머지의 상호 반발 결과를
// 바꿔서, 별 하나를 수동으로 옮기기만 해도 전혀 안 건드린 다른 별들까지
// 위치가 달라지는 도미노로 이어졌다(라이브 드래그 중이든, 드롭 직후든). 이제
// 이 함수는 항상 "movies 전체가 다 자동 배치라면"이라는 가정으로 딱 한 번
// 계산되고(MovieUniverse의 autoBodies), 수동 배치는 그 바깥에서 결과값을
// 덮어쓰는 것으로만 반영된다 — 그래서 이 함수의 결과는 어떤 별이 수동 배치로
// 바뀌든 항상 동일하다.
function relaxPositions(points: { x: number; y: number; footprint: number }[]): void {
  for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const minDist = points[i].footprint + points[j].footprint + SEPARATION_GAP
        const dx = points[j].x - points[i].x
        const dy = points[j].y - points[i].y
        const dist = Math.hypot(dx, dy) || 0.01
        if (dist >= minDist) continue
        const push = (minDist - dist) / 2
        const ux = dx / dist
        const uy = dy / dist
        pushApart(points[i], -ux * push, -uy * push)
        pushApart(points[j], ux * push, uy * push)
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
  /** 우주 안 자유 텍스트(별자리 대신 나온 방향 — CLAUDE.md 2026-09-07 참고). 없으면
   * (데모/공유 우주 중 아직 안 넘긴 곳) 빈 배열처럼 취급한다. */
  texts?: UniverseText[]
  /** 이 값이 바뀔 때마다(마운트 시 제외) 새 텍스트를 하나 만들어 바로 편집 모드로
   * 연다 — focusMovieId와 같은 "외부 트리거 → 내부 이펙트가 반응" 패턴.
   * ArchiveShell의 "+ 텍스트" 버튼이 클릭마다 이 값을 증가시킨다. */
  addTextRequestId?: number
  /** true면 editable이 false여도(데모 우주) 텍스트 생성/편집/드래그/리사이즈가
   * 전부 켜진다 — 다만 onGuestMutate 게스트 평점/메모, 게스트 드래그 배치와 같은
   * 이유로 Supabase에는 저장하지 않고 로컬 state에만 반영된다(새로고침하면
   * 사라짐). 공유(읽기 전용) 우주는 이 prop 자체를 넘기지 않아 계속 읽기 전용이다. */
  demoTexts?: boolean
  /** id → {ko, en} 캔 텍스트 매핑 — 데모 우주의 안내용 더미 텍스트처럼 언어가
   * 바뀔 때 내용도 같이 바뀌어야 하는 텍스트에만 쓴다. 지금 내용이 이 둘 중
   * 하나와 정확히 같을 때만(=아직 방문자가 직접 고쳐 쓰지 않았을 때만) 언어
   * 전환에 맞춰 자동으로 갈아끼운다 — 한 번이라도 직접 편집했으면 그 뒤로는
   * 건드리지 않는다. 데모 우주 밖에서는 안 쓴다. */
  localizedTexts?: Record<string, Record<Locale, string>>
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
  texts: initialTexts = [],
  addTextRequestId,
  demoTexts = false,
  localizedTexts,
}: Props) {
  const { locale, t } = useLocale()
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

  // (2026-09-07) 자유 텍스트 — movies와 달리 gravity/layout 등 다른 계산이 이
  // 배열에 의존하지 않아서, positionOverrides처럼 원본 위에 겹쳐 쓸 필요 없이
  // 그냥 로컬 state를 소스오브트루스로 써도 안전하다. texts prop(서버 초기값)은
  // 마운트 시 한 번만 시드로 쓰고 그 뒤로는 이 로컬 state가 진실이다.
  const [texts, setTexts] = useState<UniverseText[]>(initialTexts)
  // localizedTexts가 있으면(데모 우주의 안내용 더미 텍스트) 언어가 바뀔 때
  // 그 텍스트의 내용도 같이 바꾼다 — 예전엔 <MovieUniverse key={locale}>로
  // 컴포넌트를 통째로 재마운트시켰는데, 그러면 카메라/드리프트 애니메이션까지
  // 전부 리셋돼서 "우주가 다시 로딩되는" 것처럼 보였다(실제로 겪은 문제).
  // 이제 이 텍스트 하나의 content 필드만 콕 집어 갈아끼우고 나머지 상태(카메라,
  // 다른 별들, 이 텍스트의 위치/크기)는 그대로 둔다. 지금 내용이 두 언어 캔
  // 문구 중 하나와 정확히 같을 때만 바꾼다 — 방문자가 이미 직접 고쳐 썼으면
  // (둘 중 어느 캔 문구와도 안 맞으면) 그 뒤로는 절대 안 건드린다.
  useEffect(() => {
    if (!localizedTexts) return
    setTexts((prev) =>
      prev.map((item) => {
        const variants = localizedTexts[item.id]
        if (!variants) return item
        const next = variants[locale]
        const isStillDefault = Object.values(variants).includes(item.content)
        return isStillDefault && item.content !== next ? { ...item, content: next } : item
      }),
    )
  }, [locale, localizedTexts])
  // editable(본인 아카이브)이 아니어도 demoTexts가 켜져 있으면(데모 우주) 텍스트
  // 조작 자체는 허용한다 — 저장 여부만 editable로 따로 가른다(아래 각 핸들러).
  const textsEditable = editable || demoTexts
  // 커밋 핸들러들이 "최신 텍스트"를 참조해야 하는데(예: 위치만 바뀌어도 최신
  // size를 같이 보내야 함) 그렇다고 texts를 의존성으로 물면 매 드래그 프레임마다
  // 콜백 정체성이 바뀐다 — peekedIdRef와 같은 이유로 ref에 미러링해둔다.
  const textsRef = useRef(texts)
  useEffect(() => {
    textsRef.current = texts
  }, [texts])

  const handleTextDragPosition = useCallback((id: string, x: number, y: number) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)))
  }, [])

  const handleTextCommitPosition = useCallback(
    (id: string, x: number, y: number) => {
      if (!textsEditable) return
      if (!editable) return // 데모: 로컬 state에는 이미 반영됐고, 저장만 건너뛴다
      const size = textsRef.current.find((t) => t.id === id)?.size ?? 1
      updateUniverseTextTransform(id, x, y, size).catch((err) => {
        console.error('텍스트 위치 저장 실패', err)
      })
    },
    [editable, textsEditable],
  )

  const handleTextResize = useCallback((id: string, size: number) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, size } : t)))
  }, [])

  const handleTextCommitResize = useCallback(
    (id: string, size: number) => {
      if (!textsEditable) return
      if (!editable) return
      const current = textsRef.current.find((t) => t.id === id)
      if (!current) return
      updateUniverseTextTransform(id, current.x, current.y, size).catch((err) => {
        console.error('텍스트 크기 저장 실패', err)
      })
    },
    [editable, textsEditable],
  )

  // 편집을 끝내고 블러하면 호출된다 — 비어 있으면 삭제, 아니면 저장. 별도
  // "삭제" 버튼을 안 두는 대신 이 하나로 충분하다(내용을 지우고 나가면 사라짐).
  const handleTextCommitContent = useCallback(
    (id: string, content: string) => {
      if (!textsEditable) return
      if (content === '') {
        setTexts((prev) => prev.filter((t) => t.id !== id))
        if (editable) {
          deleteUniverseText(id).catch((err) => {
            console.error('텍스트 삭제 실패', err)
          })
        }
        return
      }
      setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)))
      if (editable) {
        updateUniverseTextContent(id, content).catch((err) => {
          console.error('텍스트 저장 실패', err)
        })
      }
    },
    [editable, textsEditable],
  )

  // "+ 텍스트" 버튼(ArchiveShell)이 addTextRequestId를 클릭마다 증가시키면 여기서
  // 반응한다 — focusMovieId와 같은 "외부 트리거" 패턴. id는 클라이언트가 미리
  // 만들어서 서버 응답을 기다리지 않고 바로 편집(타이핑)을 시작할 수 있게 한다
  // (데모 게스트 감상이 guest-${uuid} 로컬 id를 미리 만드는 것과 같은 기법).
  const prevAddTextRequestIdRef = useRef(addTextRequestId)
  useEffect(() => {
    if (addTextRequestId === undefined) return
    if (prevAddTextRequestIdRef.current === addTextRequestId) return
    prevAddTextRequestIdRef.current = addTextRequestId
    if (!textsEditable) return

    const id = crypto.randomUUID()
    const x = (Math.random() - 0.5) * 80
    const y = (Math.random() - 0.5) * 80
    setTexts((prev) => [...prev, { id, content: '', x, y, size: 1 }])
    if (editable) {
      createUniverseText(id, '', x, y, 1).catch((err) => {
        console.error('텍스트 생성 실패', err)
      })
    }
  }, [addTextRequestId, editable, textsEditable])

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

  // 각 영화의 각도를 장르 섹터로 배정한다(직접 드래그로 옮기기 전까지의
  // 기본값일 뿐 — 한 번이라도 옮기면 그 뒤로는 이 계산 자체가 안 쓰인다).
  // 장르/감독/시대 중 고를 수 있게 했던 UI는 뺐다 — 어차피 기본값일 뿐이고,
  // 직접 배치가 있으니 "무엇을 기준으로 자동 배치할지" 자체를 고민하게
  // 만들 필요가 없다는 판단(2026-09-06). movies 배열이 들어온 순서
  // (combineLoggedMovies가 "최근 감상순"으로 정렬)와 무관하게 movie.id
  // 기준으로만 정렬해서 배정하므로, 감상 날짜만 고쳐도(router.refresh로
  // 서버에서 다시 정렬된 목록을 받으면) 각도가 우르르 바뀌는 일이 없다(실제로
  // 겪은 버그) — 영화가 추가/삭제되거나 장르가 바뀔 때만 바뀐다.
  const angleByMovieId = useMemo(() => clusterAngles(movies), [movies])

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
  // 정한다(중심 없음, 2026-09-06) — 각도는 angleByMovieId(장르 섹터)로,
  // 반지름은 relatedMovies의 1위 값으로. 관계가 하나도 없으면(공통 장르조차
  // 없음) 반지름이 최대가 되어 바깥으로 밀려난다.
  //
  // (2026-09-07) 자동 배치 계산(autoBodies)은 positionOverrides에 절대 의존하지
  // 않는다 — 드래그로 어떤 별을 수동 배치(locked)로 옮기면, 그 별은 "겹침 완화에
  // 참여하는 N개" 중 하나가 사라지는 셈이라 나머지 별들의 상호 반발 결과 자체가
  // (그 별의 존재 여부와 무관하게) 달라졌다 — 관계 강도(반지름)나 장르 섹터
  // (각도)는 안 바뀌는데도, 겹침 완화 단계만 다른 결과를 냈다. 즉 "고정된 별은
  // 밀지도 밀리지도 않는다"로 완전히 배제해도, 배제 자체가 나머지의 물리
  // 시뮬레이션을 바꿔버려 "하나 옮기면 다른 것도 움직인다"는 도미노로 보였다.
  // 이제 자동 배치는 항상 "모든 영화가 다 자동 배치라면"이라는 가정으로 24편
  // 전체를 대상으로 딱 한 번 계산하고, 수동 배치 좌표는 그 결과 위에 나중에
  // 덮어씌우기만 한다 — 그래서 어떤 별을 수동으로 옮기든 안 옮기든 나머지
  // 별들의 자동 배치 결과는 항상 동일하다(수학적으로 positionOverrides를
  // 아예 모른다).
  const autoBodies = useMemo(() => {
    const computed = movies.map((movie) => {
      const related = relatedMovies(movie, movies)
      const gravity = related[0]?.gravity ?? 0
      const closestMovie = related[0]?.movie
      const angle = angleByMovieId.get(movie.id) ?? 0
      // (2026-09-07) gravity가 1에 가까운(아주 강하게 이어진) 영화가 여럿이면
      // 선형 매핑에서는 다들 MIN_RADIUS 바로 근처로 뭉쳐서 같은 반지름대에
      // 몰린다 — "의도적으로 장르/테마가 겹치게" 큐레이션한 데모 24편에서
      // 특히 심했다. 지수를 0.5로 낮춰 gravity가 1에 가까울수록(차이가
      // 작아도) 반지름 차이를 더 크게 벌린다 — 순서(가까울수록 강한 관계)는
      // 그대로 유지하면서 촘촘한 상위권만 더 펼친다.
      const radius = MIN_RADIUS + Math.pow(1 - gravity, 0.5) * (MAX_RADIUS - MIN_RADIUS)
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
        tier: tierFor(gravity),
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        dimmed,
        dimmedByHighlight,
        footprint: TIER_FOOTPRINT[tierFor(gravity)],
      }
    })
    relaxPositions(computed)
    return computed
  }, [movies, angleByMovieId, historyDate, peekedId, activeHighlightIds])

  // 드래그로 직접 배치한 좌표가 있으면(미리보기 override 우선, 없으면 저장된
  // movie.posX/posY) 위 자동 배치 결과를 무시하고 그 자리를 그대로 쓴다 — 관계
  // 강도로는 잡을 수 없는 개인적인 연결을 유저가 직접 표현한 결과이기 때문이다.
  // 이 단계는 O(n)이라 드래그하는 매 프레임(positionOverrides 변경) 다시 돌아도
  // 가볍다 — 무거운 겹침 완화(autoBodies)를 매 프레임 다시 돌릴 필요가 없다.
  const bodies = useMemo(() => {
    return autoBodies.map((body) => {
      const manualPos = positionOverrides.get(body.movie.id) ?? (body.movie.posX != null && body.movie.posY != null ? { x: body.movie.posX, y: body.movie.posY } : undefined)
      if (!manualPos) return body
      return { ...body, x: manualPos.x, y: manualPos.y, locked: true }
    })
  }, [autoBodies, positionOverrides])

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

  // 검색(MovieSearch)이나 탐색 패널 인사이트로 하이라이트된 별이 지금 화면 밖에
  // 있으면, 하이라이트만 켜져봐야 아무 일도 안 일어난 것처럼 보인다(2026-09-08
  // 실사용 피드백) — 하이라이트 대상이 생기면 그 별들이 전부 보이도록 카메라를
  // 옮긴다. peek과 달리 패널은 열지 않는다(타이핑 중에 패널이 갑자기 뜨면
  // 산만하다). 결과가 1개면 그 별로 확대(FOCUS_ZOOM, peek과 같은 배율)하고,
  // 여러 개면 전부 담기는 배율로 줌아웃한다(지도 앱의 "결과 전체 보기"와 같은
  // 방식). 하이라이트가 꺼지면(검색어 지움 등) 켜기 전 카메라로 되돌아간다.
  // bodies는 드래그 등으로 매 프레임 바뀔 수 있어 의존성에 그대로 두면 안 되므로
  // (peekedId 이펙트와 같은 함정), 하이라이트 id 집합 자체가 바뀐 경우에만
  // 실행되도록 정렬된 키로 비교한다.
  const highlightCameraSnapshotRef = useRef<{ zoom: number; panX: number; panY: number } | null>(null)
  const prevHighlightKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const active = highlightedIds && highlightedIds.size > 0 ? highlightedIds : null
    const key = active ? Array.from(active).sort().join(',') : null
    if (key === prevHighlightKeyRef.current) return
    prevHighlightKeyRef.current = key

    if (active) {
      if (!highlightCameraSnapshotRef.current) {
        highlightCameraSnapshotRef.current = { zoom: rawZoom.get(), panX: rawPanX.get(), panY: rawPanY.get() }
      }
      const matched = bodies.filter((b) => active.has(b.movie.id))
      if (matched.length === 0) return

      const xs = matched.map((b) => b.x)
      const ys = matched.map((b) => b.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const spanX = maxX - minX
      const spanY = maxY - minY
      // 별 자체 크기 + 제목 라벨이 잘리지 않을 여유.
      const FIT_PADDING = 160
      const fitZoomX = spanX > 0 ? viewport.width / (spanX + FIT_PADDING * 2) : MAX_ZOOM
      const fitZoomY = spanY > 0 ? viewport.height / (spanY + FIT_PADDING * 2) : MAX_ZOOM
      const zoomNew = Math.min(FOCUS_ZOOM, Math.max(MIN_ZOOM, Math.min(fitZoomX, fitZoomY)))
      rawZoom.set(zoomNew)
      rawPanX.set(-centerX * zoomNew)
      rawPanY.set(-centerY * zoomNew)
    } else if (highlightCameraSnapshotRef.current) {
      // (2026-09-08) 하이라이트된 별을 클릭해서 열람하면(peek) 그 클릭이
      // "검색창 바깥을 눌렀다"로도 잡혀 MovieSearch가 같은 타이밍에 검색어를
      // 지운다 — highlightedIds가 null이 되면서 여기로 들어와, 방금 peek이
      // 시작하며 그 별로 옮겨간 카메라를 검색 이전 위치로 도로 덮어써버렸다
      // ("클릭해도 줌인 안 되고 검색만 취소된다"로 보였던 실사용 버그).
      // peek이 막 시작된 경우엔 그 카메라 이동이 우선이어야 하므로 복원을
      // 건너뛴다 — 스냅샷은 어차피 이 시점 이후로 다시 쓸 일이 없어 정리만 한다.
      if (!peekedId) {
        const snap = highlightCameraSnapshotRef.current
        rawZoom.set(snap.zoom)
        rawPanX.set(snap.panX)
        rawPanY.set(snap.panY)
      }
      highlightCameraSnapshotRef.current = null
    }
  }, [highlightedIds, bodies, viewport, rawZoom, rawPanX, rawPanY, peekedId])

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
    const timer = window.setInterval(() => setHintIndex((i) => (i + 1) % IDLE_HINTS[locale].length), IDLE_HINT_CYCLE)
    return () => window.clearInterval(timer)
  }, [showHint, locale])

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

      {/* isolation: isolate로 이 레이어가 항상 자기만의 스택 컨텍스트를 갖게
          강제한다 — 안에 있는 별들의 zIndex(가까운 관계일수록 최대 수백까지
          올라간다, proximityZIndex)가 카메라 기본 배율(팬/줌 0 상태)일 때
          바깥으로 새어나가 상단/하단 상시 버튼(검색/+텍스트/가이드 등)을
          덮어버리는 버그가 있었다 — framer motion이 x/y/scale이 전부 항등값일
          때 실제 transform을 안 걸어서(별자리 기능 때 겪었던 것과 같은 원인,
          CLAUDE.md 2026-09-07) transform 유무에 기대지 않고 명시적으로
          스택 컨텍스트를 만든다. */}
      <motion.div className="absolute inset-0" style={{ x: panX, y: panY, scale: zoom, isolation: 'isolate' }}>
        {bodies.map(({ movie, gravity, closestMovie, x, y, tier, dimmed, dimmedByHighlight }) => (
          <MovieBody
            key={movie.id}
            movie={movie}
            closestMovie={closestMovie}
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
            /* (2026-09-07) 드래그 배치는 로그인 여부와 무관하게 항상 켠다 — 데모
               우주에서도 "나만의 배치"를 체험해볼 수 있어야 한다는 피드백. 실제
               DB 저장(handleCommitPosition)은 그 안에서 editable을 다시 확인해
               로그인한 본인 우주에서만 일어난다 — 데모는 positionOverrides라는
               로컬 state에만 남아 새로고침하면 원래 자동 배치로 돌아간다(평점/
               메모의 게스트 체험과 같은 패턴). */
            onDragPosition={handleDragPosition}
            onCommitPosition={handleCommitPosition}
          />
        ))}

        {texts.map((t) => (
          <TextObject
            key={t.id}
            text={t}
            editable={textsEditable}
            zoomScale={zoom}
            onDragPosition={handleTextDragPosition}
            onCommitPosition={handleTextCommitPosition}
            onResize={handleTextResize}
            onCommitResize={handleTextCommitResize}
            onCommitContent={handleTextCommitContent}
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
          className="absolute left-4 top-4 z-[60] text-[10px] tracking-[var(--tk-30)] text-white/60 outline-none transition-colors duration-500 hover:text-white/90"
        >
          {t('nav.exit')}
        </button>
      ) : (
        cameraAway && (
          <button
            type="button"
            onClick={resetCamera}
            className="absolute left-4 top-4 z-[60] text-[10px] tracking-[var(--tk-30)] text-white/60 outline-none transition-colors duration-500 hover:text-white/90"
          >
            {t('nav.recenter')}
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
          className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-light tracking-[var(--tk-30)] text-white/30"
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
              {IDLE_HINTS[locale][hintIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
