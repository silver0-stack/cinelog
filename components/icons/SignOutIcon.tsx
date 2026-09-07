// HelpIcon/SearchIcon과 같은 톤(가는 선, currentColor)의 최소한의 로그아웃
// 아이콘(문 프레임 + 밖을 향한 화살표) — 설정 페이지의 "로그아웃" 메뉴 항목
// 앞에 쓴다.
export function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M6.5 1.5h-3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3" strokeLinecap="round" />
      <path d="M14 8H6" strokeLinecap="round" />
      <path d="M11 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
