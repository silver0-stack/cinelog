// 데모/공유 화면 구석에 두는 보조 내비게이션 링크(LOG IN, ABOUT, 나도 기록하기 등)
// 공통 스타일. 예전엔 대기 상태 명도가 white/20 수준이라 마우스를 올려야만 겨우
// 보였다 — 터치 기기는 hover 자체가 없어서 사실상 영원히 안 보이는 상태였다.
// 얇은 타이포그래피/넓은 자간(톤앤매너)은 유지하되, 대기 상태에서도 읽을 수 있게 한다.
// (2026-09-06) /45로도 부족했다 — 실사용자 테스트(가족)에게 시켜봤더니 이런 구석
// 링크들의 존재 자체를 전혀 몰랐다는 피드백. 한 번 더 올린다.
export const secondaryNavLinkClass =
  'text-[11px] font-light tracking-[var(--tk-35)] text-white/60 outline-none transition-colors duration-500 hover:text-white/90 focus-visible:text-white/90'

// 화면 어디서든 항상 떠 있는 1차 조작 버튼(검색/가이드/+ 기록/탐색/우주 공유 등)
// 공통 스타일. 예전엔 각 컴포넌트가 이 값(text-white/40)과 밝은 포스터 위에서
// 읽히기 위한 text-shadow를 따로따로 복제해 갖고 있었다 — ArchiveShell,
// MovieSearch, ShareButton, DemoUniverseStage, SharedUniverseShell에 거의 같은
// 상수가 5번 흩어져 있었다. secondaryNavLinkClass와 같은 이유(실사용자 테스트에서
// "버튼이 있는 줄도 몰랐다"는 피드백)로 명도를 올리면서, 이 김에 하나로 합친다.
// (2026-09-06) 글자만 밝게 해도 "눌러야 하는 버튼"이라는 형태 신호가 없어서
// 여전히 눈에 안 띈다는 피드백 — 아주 얇은 테두리 + 미세한 채움을 더해 텍스트가
// 아니라 버튼처럼 보이게 한다. 유리질 블러/그라데이션/글로우는 쓰지 않는다
// (CLAUDE.md가 피하라고 한 glassmorphism과는 다르다 — 배경 흐림 없는 순수
// 테두리+단색 저채움).
export const navLinkClass =
  'rounded-full border border-white/25 bg-white/[0.06] px-3 py-1.5 text-xs font-light tracking-[var(--tk-15)] sm:tracking-[var(--tk-25)] text-white/75 outline-none transition-colors duration-500 hover:border-white/55 hover:bg-white/[0.12] hover:text-white/95 focus-visible:border-white/55 focus-visible:bg-white/[0.12] focus-visible:text-white/95 [text-shadow:0_0_10px_rgba(0,0,0,0.9),0_0_4px_rgba(0,0,0,0.9)]'

// 데모 우주에서 유일한 "전환" 액션(로그인)을 나머지 outline 버튼들과 다른
// 무게로 표현하려고 만든 solid 채움 스타일. 색을 넣는 대신 채움 강도로
// 위계를 나눈다 — CLAUDE.md 섹션 9가 네온/그라데이션 대신 톤으로 승부하기로
// 정해뒀기 때문에, 로그인만 색이 있으면 안 되고 "가장 꽉 찬 버튼"이면 된다
// (2026-09-08, 사용자 피드백: 로그인 버튼이 다른 버튼들과 안 구분된다).
export const primaryNavLinkClass =
  'rounded-full border border-white/90 bg-white/90 px-3.5 py-1.5 text-xs font-light tracking-[var(--tk-15)] sm:tracking-[var(--tk-25)] text-black outline-none transition-colors duration-500 hover:bg-white hover:border-white focus-visible:bg-white focus-visible:border-white'
