import { ImageResponse } from 'next/og'
import { getSharedUniverseData } from './_data'
import { combineLoggedMovies } from '@/lib/loggedMovies'
import { summarizeUniverse } from '@/lib/universeInsights'
import { loadKoreanFont } from '@/lib/ogFont'

export const runtime = 'nodejs'
export const alt = '영화 우주'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// 카드 링크에 요청(사람 방문 + 트위터/카톡 크롤러)이 몰릴 때 매번 다시 안
// 그리도록 캐싱한다 — m/[slug]/opengraph-image.tsx와 같은 이유.
export const revalidate = 3600

// 이 우주의 실제 gravity 배치(MovieUniverse.tsx의 클러스터 각도/반발 계산)를
// 그대로 재현하지 않는다 — 그러면 그 레이아웃 로직을 여기에도 옮겨야 해서
// 유지보수 지점이 하나 더 생긴다(m/[slug]의 페이지/다운로드/OG 세 곳이 서로
// 갈라졌던 것과 같은 함정, CLAUDE.md 2026-09-07 세션 로그 참고). 대신 영화
// id로 만든 고정 좌표로 "별이 흩어진 느낌"만 낸다 — 실제 배치와 안 맞아도
// 미리보기 카드로서는 문제없다. 같은 slug는 매번 같은 모양으로 나온다.
function seededPosition(id: string, index: number): { x: number; y: number; r: number; o: number } {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const x = 4 + ((hash % 977) / 977) * 92
  const y = 4 + (((hash >> 8) % 613) / 613) * 92
  const r = 1.5 + ((hash + index) % 3)
  const o = 0.15 + ((hash % 40) / 100)
  return { x, y, r, o }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getSharedUniverseData(slug)
  const movies = combineLoggedMovies(result?.rows ?? [], result?.viewingRows ?? [])
  const insights = summarizeUniverse(movies)
  const headline = insights[0]

  const headlineText = headline ? `${headline.label} · ${headline.value}` : ''
  const text = ['CINELOG UNIVERSE', `${movies.length}편의 영화`, headlineText, 'CINELOG'].join('')
  const fontData = await loadKoreanFont(text)
  const fontFamily = fontData ? 'Noto Sans KR' : undefined

  const stars = movies.slice(0, 90).map((m, i) => ({ id: m.id, ...seededPosition(m.id, i) }))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#050505',
          color: '#fff',
          fontFamily,
        }}
      >
        {stars.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              position: 'absolute',
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.r,
              height: s.r,
              borderRadius: '50%',
              background: `rgba(255,255,255,${s.o})`,
            }}
          />
        ))}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            margin: 'auto',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', fontSize: 14, letterSpacing: 10, opacity: 0.35 }}>CINELOG UNIVERSE</div>
          <div style={{ display: 'flex', fontSize: 52, letterSpacing: 2, opacity: 0.95 }}>{movies.length}편의 영화</div>
          {headlineText && (
            <div style={{ display: 'flex', fontSize: 18, letterSpacing: 3, opacity: 0.5 }}>{headlineText}</div>
          )}
        </div>

        <div style={{ display: 'flex', position: 'absolute', right: 44, bottom: 30, fontSize: 13, letterSpacing: 9, opacity: 0.25 }}>
          CINELOG
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' }] : undefined,
    },
  )
}
