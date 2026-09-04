import { ImageResponse } from 'next/og'
import { fetchCardMovie } from '../_data'
import { ratingLine, truncate, loadKoreanFont, loadPosterDataUri } from '../_shareImage'

export const runtime = 'nodejs'
// "이미지 저장" 버튼으로 직접 다운로드해서 인스타그램 등에 올리는 용도다.
// 링크만 공유해서는 미리보기가 안 뜨는 플랫폼(인스타그램 스토리 등)은
// 사람이 이 이미지를 저장해서 직접 올리는 수밖에 없다 — 그래서 특정
// 플랫폼 슬롯(og:image의 1200×630 가로)이 아니라, 스토리/피드 어디에
// 올려도 무난한 1080×1080 정사각형으로 만든다.
const size = { width: 1080, height: 1080 }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const movie = await fetchCardMovie(slug)

  const noteText = movie?.note ? truncate(movie.note, 60) : ''
  const rewatchCount = Math.max(0, (movie?.viewings?.length ?? 0) - 1)

  const text = [
    movie?.title ?? '',
    movie ? `${movie.year} · ${movie.director}` : '',
    movie?.rating != null ? ratingLine(movie.rating) : '',
    noteText ? `“${noteText}”` : '',
    `${rewatchCount}번 다시 봄`,
    'CINELOG',
  ].join('')

  const [posterDataUri, fontData] = await Promise.all([
    movie?.posterPath ? loadPosterDataUri(movie.posterPath) : Promise.resolve(null),
    loadKoreanFont(text),
  ])
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
          justifyContent: 'space-between',
          background: '#050505',
          color: '#fff',
          padding: '70px 70px',
          fontFamily,
        }}
      >
        <div />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          {posterDataUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterDataUri} alt="" width={280} height={420} style={{ objectFit: 'cover' }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 40, letterSpacing: 3, opacity: 0.92 }}>{movie?.title ?? ''}</div>
            <div style={{ display: 'flex', fontSize: 20, letterSpacing: 6, opacity: 0.45 }}>
              {movie ? `${movie.year} · ${movie.director}` : ''}
            </div>
          </div>

          {movie?.rating != null && (
            <div style={{ display: 'flex', fontSize: 26, letterSpacing: 9, opacity: 0.7 }}>{ratingLine(movie.rating)}</div>
          )}

          {noteText && (
            <div style={{ display: 'flex', maxWidth: 620, fontSize: 18, opacity: 0.55, textAlign: 'center' }}>
              “{noteText}”
            </div>
          )}

          {rewatchCount > 0 && (
            <div style={{ display: 'flex', fontSize: 15, letterSpacing: 4, opacity: 0.3 }}>{rewatchCount}번 다시 봄</div>
          )}
        </div>

        <div style={{ display: 'flex', fontSize: 15, letterSpacing: 10, opacity: 0.25 }}>CINELOG</div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' }] : undefined,
      headers: {
        // og:image(opengraph-image.tsx)는 revalidate로 캐싱하지만, 이건 사람이
        // "저장" 버튼을 눌러 그때그때 받는 파일이라 매번 최신 데이터로 만든다.
        'Cache-Control': 'no-store',
      },
    },
  )
}
