// 태극기를 아주 작은 크기(버튼 옆 배지)에서도 알아볼 수 있게 단순화했다 —
// 4괘 위치/굵기까지 정밀하게 재현하진 않는다(16px 안에서는 어차피 안 읽힘).
// 윈도우가 국기 이모지를 국가 코드 텍스트로 대체해버리는 문제(플랫폼 한계,
// 마이크로소프트가 국기 이모지 자체를 지원 안 함) 때문에 이모지 대신 직접
// 그린 SVG를 쓴다.
export function FlagKR({ size = 16 }: { size?: number }) {
  const h = Math.round(size * 0.7)
  return (
    <svg width={size} height={h} viewBox="0 0 20 14" aria-hidden="true" className="shrink-0">
      <rect x="0.5" y="0.5" width="19" height="13" rx="1.5" fill="#fff" stroke="rgba(0,0,0,0.25)" />
      <g transform="translate(10,7)">
        <path d="M0,-3.2 A3.2,3.2 0 0 1 0,3.2 A1.6,1.6 0 0 1 0,0 A1.6,1.6 0 0 0 0,-3.2 Z" fill="#c60c30" />
        <path d="M0,3.2 A3.2,3.2 0 0 1 0,-3.2 A1.6,1.6 0 0 1 0,0 A1.6,1.6 0 0 0 0,3.2 Z" fill="#003478" />
      </g>
      <g stroke="#000" strokeWidth="0.55">
        <g transform="translate(3.1,2.6) rotate(-30)">
          <line x1="-1.4" y1="-0.55" x2="1.4" y2="-0.55" />
          <line x1="-1.4" y1="0" x2="1.4" y2="0" />
          <line x1="-1.4" y1="0.55" x2="1.4" y2="0.55" />
        </g>
        <g transform="translate(16.9,11.4) rotate(-30)">
          <line x1="-1.4" y1="-0.55" x2="-0.2" y2="-0.55" />
          <line x1="0.2" y1="-0.55" x2="1.4" y2="-0.55" />
          <line x1="-1.4" y1="0" x2="-0.2" y2="0" />
          <line x1="0.2" y1="0" x2="1.4" y2="0" />
          <line x1="-1.4" y1="0.55" x2="-0.2" y2="0.55" />
          <line x1="0.2" y1="0.55" x2="1.4" y2="0.55" />
        </g>
        <g transform="translate(16.9,2.6) rotate(30)">
          <line x1="-1.4" y1="-0.55" x2="1.4" y2="-0.55" />
          <line x1="-1.4" y1="0" x2="-0.2" y2="0" />
          <line x1="0.2" y1="0" x2="1.4" y2="0" />
          <line x1="-1.4" y1="0.55" x2="1.4" y2="0.55" />
        </g>
        <g transform="translate(3.1,11.4) rotate(30)">
          <line x1="-1.4" y1="-0.55" x2="-0.2" y2="-0.55" />
          <line x1="0.2" y1="-0.55" x2="1.4" y2="-0.55" />
          <line x1="-1.4" y1="0" x2="1.4" y2="0" />
          <line x1="-1.4" y1="0.55" x2="-0.2" y2="0.55" />
          <line x1="0.2" y1="0.55" x2="1.4" y2="0.55" />
        </g>
      </g>
    </svg>
  )
}
