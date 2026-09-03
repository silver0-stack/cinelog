// 데모/공유 화면 구석에 두는 보조 내비게이션 링크(LOG IN, ABOUT, 나도 기록하기 등)
// 공통 스타일. 예전엔 대기 상태 명도가 white/20 수준이라 마우스를 올려야만 겨우
// 보였다 — 터치 기기는 hover 자체가 없어서 사실상 영원히 안 보이는 상태였다.
// 얇은 타이포그래피/넓은 자간(톤앤매너)은 유지하되, 대기 상태에서도 읽을 수 있게 한다.
export const secondaryNavLinkClass =
  'text-[11px] font-light tracking-[0.35em] text-white/45 outline-none transition-colors duration-500 hover:text-white/85 focus-visible:text-white/85'
