// "탐색"을 상징하는 아이콘 — 일반적인 돋보기/차트 아이콘 대신, 이 앱의 핵심
// 은유(중심 별 주위를 도는 궤도)를 그대로 가져왔다. CopyIcon과 같은 톤(가는 선,
// currentColor)을 유지한다.
export function OrbitIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <ellipse cx="8" cy="8" rx="7" ry="3" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
