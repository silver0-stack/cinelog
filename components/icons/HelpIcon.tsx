// CopyIcon과 같은 톤(가는 선, currentColor)의 최소한의 물음표 아이콘. "가이드"
// 텍스트만 있으면 버튼처럼 안 읽힌다는 피드백으로 앞에 붙인다.
export function HelpIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6.2 6.3c0-1.1 0.9-2 1.9-2s1.9 0.8 1.9 1.8c0 1.4-1.9 1.6-1.9 3.1" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
