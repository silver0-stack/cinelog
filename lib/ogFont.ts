// Satori(next/og)의 기본 폰트는 한글 글리프가 없다 — 화면에 찍힐 텍스트를
// 직접 안 실어주면 글자가 안 뜨거나 깨진다. Google Fonts의 CSS2 API에
// text= 파라미터를 주면 실제로 쓰는 글자만 담긴 가벼운 폰트 파일을 받을 수 있다.
// 네트워크 요청이 실패해도(오프라인 등) 카드 생성 자체가 죽지 않도록 실패하면
// 조용히 기본 폰트로 넘어간다 — 한글이 안 보일 수는 있어도 이미지 자체는 뜬다.
//
// app/m/[slug]/_shareImage.ts와 루트 app/opengraph-image.tsx가 공유해서 쓴다.
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
