// 공용 이징/타이밍 값. 프로젝트 전체에서 "느리고 무거운" 움직임을 일관되게 유지하기 위해 분리한다.

export const EASE_SLOW = [0.65, 0, 0.35, 1] as const
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const

export const DURATION = {
  fade: 1.2,
  approach: 2.4,
  pause: 650,
  seatedReveal: 1.8,
} as const

// 착석 → 블랙홀 전환의 각 단계별 길이(ms). 절대 서두르지 않는다 — 이 전환이
// "빨려 들어가는" 느낌을 주는 것은 속도가 아니라 무게감에서 온다.
export const BLACKHOLE = {
  hold: 2200,
  dim: 1800,
  converge: 2800,
  collapse: 2600,
} as const
