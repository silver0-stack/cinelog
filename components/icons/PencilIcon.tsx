// CopyIcon과 같은 톤(가는 선, currentColor)의 최소한의 연필 아이콘.
// 포스터 앞면의 "정보 수정" 진입점으로 쓴다 — 텍스트 라벨을 얹기엔 포스터
// 위라 자리가 마땅치 않아서, 카피 아이콘과 같은 예외로 둔다.
export function PencilIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2 14l0.6-3.2L9.8 3.6l2.6 2.6-7.2 7.2L2 14z" strokeLinejoin="round" />
      <path d="M8.8 4.6l2.6 2.6" />
    </svg>
  )
}
