// CopyIcon과 짝을 이루는 체크 아이콘 — 복사가 끝난 직후 잠깐(1.5초) CopyIcon
// 자리를 대신한다. 툴팁 텍스트("복사됨")만으로는 호버하지 않으면 안 보여서,
// 아이콘 자체가 바뀌어야 눈에 들어온다는 피드백으로 추가했다.
export function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
