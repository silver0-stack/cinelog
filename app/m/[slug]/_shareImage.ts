// opengraph-image.tsx(링크 미리보기용, 1200×630 가로)와 download-image/route.ts
// (저장용, 1080×1080 정사각형) 둘 다 같은 데이터로 그리는데 캔버스 비율만
// 다르다 — 포스터/폰트 로딩 같은 공통 로직을 여기 하나로 모은다.

export function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// 고정 크기 캔버스라 스크롤이 없다 — 이 사진들은 요약용 미리보기일 뿐이고,
// 전체 감상 이력은 이 이미지가 링크하는 웹페이지(page.tsx)에서 한 장씩
// 넘겨볼 수 있다(ViewingHistoryStepper). 그래서 여기서는 넘치지 않을 만큼만
// 짧게 자른다.
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// Satori(next/og)의 기본 폰트는 한글 글리프가 없다 — 제목/감독이 전부 한글이라
// 폰트를 직접 안 실어주면 글자가 안 뜨거나 깨진다. Google Fonts의 CSS2 API에
// text= 파라미터를 주면 실제로 쓰는 글자만 담긴 가벼운 폰트 파일을 받을 수 있다.
// 네트워크 요청이 실패해도(오프라인 등) 카드 생성 자체가 죽지 않도록 실패하면
// 조용히 기본 폰트로 넘어간다 — 한글이 안 보일 수는 있어도 이미지 자체는 뜬다.
export async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600&text=${encodeURIComponent(text)}`
    const css = await (await fetch(cssUrl)).text()
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/)
    if (!match) return null

    const fontRes = await fetch(match[1])
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

// Satori가 <img src="https://..."> 를 만나면 렌더링 중에 자체적으로 그 URL을
// fetch하는데, 이 경로가 환경에 따라 실패할 수 있다("fetch failed"로 카드 생성
// 자체가 죽어버림). 대신 여기서 직접 fetch해서 base64 data URI로 박아넣으면
// Satori는 이미 있는 이미지를 그리기만 하면 된다 — 실패해도 포스터만 빠지고
// 카드 자체는 계속 뜬다.
export async function loadPosterDataUri(posterPath: string): Promise<string | null> {
  try {
    const res = await fetch(`https://image.tmdb.org/t/p/w500${posterPath}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`
  } catch {
    return null
  }
}
