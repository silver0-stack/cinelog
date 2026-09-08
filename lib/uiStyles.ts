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
// (2026-09-08) 그래도 LOG IN(꽉 찬 흰색)만 유독 눈에 띄고 나머지는 여전히
// 밋밋해 보인다는 피드백 — 처음엔 흰색 채움 농도만 살짝 올렸는데(0.06→0.1),
// 우주 배경이 알록달록한 포스터라 흰색을 옅게 얹는 정도로는 거의 안 보였다
// (검은 배경인 랜딩에서만 그나마 티가 났다). 어떤 배경 위에서도 확실히
// "칩처럼 떠 있다"고 읽히려면 흰색을 더 진하게 얹는 것보다, 반투명 검정으로
// 바탕 자체를 깔아 대비를 만드는 쪽이 낫다 — 여전히 색은 안 쓰고 흑백 톤
// 안에서 대비만 세게 준 것이다. 검색 패널이 이미 쓰는 `bg-black`과 같은 계열.
export const navLinkClass =
  'rounded-full border border-white/40 bg-black/50 px-3 py-1.5 text-xs font-light tracking-[var(--tk-15)] sm:tracking-[var(--tk-25)] text-white/85 outline-none transition-colors duration-500 hover:border-white/70 hover:bg-black/70 hover:text-white/95 focus-visible:border-white/70 focus-visible:bg-black/70 focus-visible:text-white/95 [text-shadow:0_0_10px_rgba(0,0,0,0.9),0_0_4px_rgba(0,0,0,0.9)]'

// 데모 우주에서 유일한 "전환" 액션(로그인)을 나머지 outline 버튼들과 다른
// 무게로 표현하려고 만든 solid 채움 스타일. 색을 넣는 대신 채움 강도로
// 위계를 나눈다 — CLAUDE.md 섹션 9가 네온/그라데이션 대신 톤으로 승부하기로
// 정해뒀기 때문에, 로그인만 색이 있으면 안 되고 "가장 꽉 찬 버튼"이면 된다
// (2026-09-08, 사용자 피드백: 로그인 버튼이 다른 버튼들과 안 구분된다).
export const primaryNavLinkClass =
  'rounded-full border border-white/90 bg-white/90 px-3.5 py-1.5 text-xs font-light tracking-[var(--tk-15)] sm:tracking-[var(--tk-25)] text-black outline-none transition-colors duration-500 hover:bg-white hover:border-white focus-visible:bg-white focus-visible:border-white'
