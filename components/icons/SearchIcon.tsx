// CopyIcon과 같은 톤(가는 선, currentColor)의 최소한의 돋보기 아이콘. "검색"
// 텍스트만 있으면 눌러야 하는 버튼인지 그냥 라벨인지 구분이 안 된다는 피드백으로
// 앞에 붙인다.
export function SearchIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M13.3 13.3l-3.6-3.6" strokeLinecap="round" />
    </svg>
  )
}
