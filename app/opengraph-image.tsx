import { ImageResponse } from 'next/og'
import { loadKoreanFont } from '@/lib/ogFont'

export const runtime = 'nodejs'
export const alt = 'CINELOG — 영화와 영화 사이, 당신만의 우주'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// 사이트 전체에 쓰는 기본 카드라 자주 안 바뀐다 — 크롤러가 다시 가져갈 때마다
// 새로 그리지 않고 캐시된 이미지를 즉시 내려준다.
export const revalidate = 86400

const TAGLINE = '영화와 영화 사이, 당신만의 우주'

// 사이트 루트/로그인/공유 우주 등 자기 og:image가 따로 없는 모든 페이지의
// 기본값이 된다(/m/[slug]만 영화 카드 전용 이미지를 따로 가진다). 정적인
// 텍스트라 movie 데이터 없이 CINELOG 워드마크 + 태그라인만 그린다.
export default async function Image() {
  const fontData = await loadKoreanFont(TAGLINE)
  const fontFamily = fontData ? 'Noto Sans KR' : undefined

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#fff',
          fontFamily,
        }}
      >
        <div style={{ display: 'flex', fontSize: 64, letterSpacing: 20, opacity: 0.9 }}>CINELOG</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 22, letterSpacing: 6, opacity: 0.4 }}>
          {TAGLINE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' }] : undefined,
    },
  )
}
