// HelpIcon/SearchIcon과 같은 톤(가는 선, currentColor)의 최소한의 지구본
// 아이콘 — 설정 페이지의 "언어" 메뉴 항목 앞에 쓴다.
export function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M1.5 8h13" />
      <path d="M8 1.5c2.2 2 2.2 11 0 13c-2.2-2-2.2-11 0-13" />
    </svg>
  )
}
