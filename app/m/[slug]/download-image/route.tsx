import { ImageResponse } from 'next/og'
import { fetchCardMovie } from '../_data'
import { ratingDots, ticketNumber, truncate, loadKoreanFont, loadPosterDataUri } from '../_shareImage'

export const runtime = 'nodejs'
// "이미지 저장" 버튼으로 직접 다운로드해서 인스타그램 등에 올리는 용도다.
// 링크만 공유해서는 미리보기가 안 뜨는 플랫폼(인스타그램 스토리 등)은
// 사람이 이 이미지를 저장해서 직접 올리는 수밖에 없다 — 그래서 특정
// 플랫폼 슬롯(og:image의 1200×630 가로)이 아니라 스토리/피드 어디에 올려도
// 무난한 비율로 만든다. 원래는 1080×1080 정사각형이었는데, 실제로 저장해서
// 보니 정사각형이라 영화표 느낌이 안 살았다 — 인스타 피드가 잘림 없이 보여주는
// 최대 세로 비율인 4:5(1080×1350)로 바꿨다. 스토리(9:16)에 올리면 위아래에
// 여백이 붙지만(인스타가 자동으로 처리) 피드에서는 이 비율 그대로 꽉 찬다.
const size = { width: 1080, height: 1350 }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const movie = await fetchCardMovie(slug)

  const noteText = movie?.note ? truncate(movie.note, 60) : ''
  const rewatchCount = Math.max(0, (movie?.viewings?.length ?? 0) - 1)
  // 이 이미지는 페이지(page.tsx)와 달리 스크롤이 없는 고정 캔버스라 감상
  // 이력을 전부 나열할 수 없다 — 몇 번 봤는지 숫자로만 요약하고, 회차별
  // 상세는 이미지가 링크하는 웹페이지(ViewingHistoryTimeline)에서 보게 한다.
  const watchedAt = movie?.viewings?.[0]?.watchedAt

  const text = [
    '영화입장권',
    movie?.title ?? '',
    movie ? `${movie.year} · ${movie.director}` : '',
    watchedAt ?? '',
    movie?.rating != null ? ratingDots(movie.rating) : '',
    noteText,
    `${rewatchCount}회`,
    'CINELOG',
  ].join('')

  const [posterDataUri, fontData] = await Promise.all([
    movie?.posterPath ? loadPosterDataUri(movie.posterPath) : Promise.resolve(null),
    loadKoreanFont(text),
  ])
  const fontFamily = fontData ? 'Noto Sans KR' : undefined
  const rule = { borderBottom: '2px dashed rgba(255,255,255,0.2)' }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#fff',
          fontFamily,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 860, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '22px 44px', ...rule }}>
            <div style={{ display: 'flex', fontSize: 16, letterSpacing: 10, opacity: 0.4 }}>영화입장권</div>
            <div style={{ display: 'flex', fontSize: 14, letterSpacing: 2, opacity: 0.3 }}>No.{ticketNumber(slug)}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 44px', ...rule }}>
            {posterDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterDataUri}
                alt=""
                width={300}
                height={430}
                style={{ objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  width: 300,
                  height: 430,
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 13, letterSpacing: 3, opacity: 0.2 }}>포스터 없음</div>
              </div>
            )}
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '38px 44px', ...rule }}
          >
            <div style={{ display: 'flex', fontSize: 38, letterSpacing: 2, opacity: 0.92 }}>{movie?.title ?? ''}</div>
            <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, opacity: 0.4 }}>
              {movie ? `${movie.year} · ${movie.director}` : ''}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              padding: '34px 44px',
              fontSize: 16,
              letterSpacing: 1,
              ...(noteText ? rule : {}),
            }}
          >
            {watchedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', opacity: 0.4 }}>관람일</div>
                <div style={{ display: 'flex', opacity: 0.8 }}>{watchedAt}</div>
              </div>
            )}
            {movie?.rating != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', opacity: 0.4 }}>평점</div>
                <div style={{ display: 'flex', fontSize: 17, opacity: 0.7 }}>{ratingDots(movie.rating)}</div>
              </div>
            )}
            {rewatchCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', opacity: 0.4 }}>다시 봄</div>
                <div style={{ display: 'flex', opacity: 0.8 }}>{rewatchCount}회</div>
              </div>
            )}
          </div>

          {noteText && (
            <div style={{ display: 'flex', padding: '32px 44px' }}>
              <div style={{ display: 'flex', fontSize: 17, lineHeight: 1.6, opacity: 0.55 }}>{noteText}</div>
            </div>
          )}
        </div>
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
