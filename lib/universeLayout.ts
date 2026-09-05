// MovieUniverse와 MovieBody가 함께 알아야 하는 배치 상수. MovieBody가 editorial
// connection 드래그(P2-6) 중에 반지름을 스스로 clamp하려면 이 값들이 필요하다.
export const MIN_RADIUS = 90
export const MAX_RADIUS = 420

// 카메라 줌 배율의 하한/상한. MovieBody가 줌 구간별로 메타 정보/포스터를
// 단계적으로 감추는 애니메이션(별로 수렴)의 기준점을 잡는 데도 이 값이 필요하다.
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 10

export function clampRadius(radius: number, min = MIN_RADIUS, max = MAX_RADIUS): number {
  return Math.min(max, Math.max(min, radius))
}

/** 반지름 → 그 반지름을 만드는 gravity 값(역함수). MIN_RADIUS/MAX_RADIUS와 항상 짝을 이룬다. */
export function gravityForRadius(radius: number): number {
  return 1 - (radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)
}
