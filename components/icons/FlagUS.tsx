// FlagKR.tsx와 같은 이유(윈도우 국기 이모지 미지원)로 이모지 대신 직접 그린
// 성조기 — 별 50개 대신 캔턴에 작은 점 몇 개로만 암시한다(16px에서는 어차피
// 개수를 셀 수 없다).
export function FlagUS({ size = 16 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  const stripeH = 14 / 7
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" aria-hidden="true" className="shrink-0">
      <clipPath id="flag-us-clip">
        <rect x="0.5" y="0.5" width="19" height="13" rx="1.5" />
      </clipPath>
      <g clipPath="url(#flag-us-clip)">
        <rect x="0.5" y="0.5" width="19" height="13" fill="#fff" />
        {[0, 2, 4, 6].map((i) => (
          <rect key={i} x="0.5" y={0.5 + i * stripeH} width="19" height={stripeH} fill="#b22234" />
        ))}
        <rect x="0.5" y="0.5" width="9" height="7" fill="#3c3b6e" />
        <g fill="#fff">
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <circle key={`${row}-${col}`} cx={2 + col * 2.8} cy={2 + row * 2.3} r="0.35" />
            )),
          )}
        </g>
      </g>
      <rect x="0.5" y="0.5" width="19" height="13" rx="1.5" fill="none" stroke="rgba(0,0,0,0.25)" />
    </svg>
  )
}
