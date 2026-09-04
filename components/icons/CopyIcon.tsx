// 텍스트만 있으면 "눌러도 되는 링크"인지 "눌러야 만들어지는 버튼"인지 구분이 안
// 간다는 지적으로 복사 아이콘을 붙인다. 이 앱은 어디에도 아이콘을 안 쓰지만,
// 클립보드 복사라는 동작 자체가 아이콘 없이는 잘 안 읽혀서 예외로 둔다 — 이모지
// 대신 앱의 톤(가는 선, currentColor)에 맞춘 최소한의 SVG로. ShareButton/
// ShareCardButton 둘 다 쓰므로 공용 컴포넌트로 뺐다.
export function CopyIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.2" />
      <path d="M2.5 10.5v-8A1 1 0 0 1 3.5 1.5h8" />
    </svg>
  )
}
