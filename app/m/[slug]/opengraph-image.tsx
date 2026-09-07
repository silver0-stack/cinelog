import { ImageResponse } from 'next/og'
import { getCachedCardMovie } from './_data'
import { ratingDots, ticketNumber, truncate, loadKoreanFont, loadPosterDataUri } from './_shareImage'

export const runtime = 'nodejs'
export const alt = '영화 카드'
// X(트위터)의 summary_large_image 카드는 가로로 넓은 슬롯(약 1.91:1)을
// 기대한다 — 세로 이미지를 넣으면 위아래가 잘려서 제목/브랜드가 잘렸다.
// 이 파일은 og:image(그리고 twitter-image가 따로 없으면 twitter:image도
// 자동으로 이 파일을 쓴다)라서 여기를 가로로 맞추면 두 곳 다 해결된다.
// 저장해서 인스타 등에 직접 올리는 용도는 download-image/route.ts(정사각형)가
// 따로 맡는다.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// 첫 요청(콜드)은 포스터/폰트 외부 fetch 때문에 여전히 시간이 걸린다 — 트위터
// 등 크롤러가 같은 카드를 다시 가져갈 때는 매번 새로 만들지 않고 캐시된 이미지를
// 즉시 내려주도록 캐싱한다. 평점/메모가 바뀌어도 1시간 정도 지연 반영되는 건
// 카드 공유 특성상 크게 문제되지 않는다.
export const revalidate = 3600

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const movie = await getCachedCardMovie(slug)

  const noteText = movie?.note ? truncate(movie.note, 46) : ''
  // 감상의 연혁은 이 사진에서 항목별로 보여주지 않는다(고정 크기라 넘치면 잘리니까)
  // — "몇 번 다시 봤는지"만 짧게 알려주고, 전체 이력은 링크된 웹페이지에서 본다.
  const rewatchCount = Math.max(0, (movie?.viewings?.length ?? 0) - 1)

  // 폰트 서브셋 요청에는 화면에 실제로 찍히는 문자열을 그대로 다 넣어야 한다 —
  // 제목/메모만 넣고 별점(★☆)이나 가운뎃점(·), 인용부호(" "), 연도 숫자를
  // 빠뜨리면 그 글자들은 폰트에 아예 없어서 이미지에서 안 보이거나 깨진다.
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

  // 포스터/폰트는 서로 의존관계가 없는 별개의 외부 요청이라 순서대로(직렬로)
  // 기다릴 이유가 없다 — 직렬로 하면 트위터 카드 크롤러의 타임아웃(수 초)을
  // 넘겨서 빈 이미지로 보이는 문제가 있었다. 동시에 실행해서 전체 대기 시간을
  // 둘 중 더 느린 쪽 하나로 줄인다.
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
        <div style={{ display: 'flex', flexDirection: 'column', width: 1080, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 44px', ...rule }}>
            <div style={{ display: 'flex', fontSize: 15, letterSpacing: 10, opacity: 0.4 }}>영화입장권</div>
            <div style={{ display: 'flex', fontSize: 13, letterSpacing: 2, opacity: 0.3 }}>No.{ticketNumber(slug)}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', padding: '34px 44px', gap: 48, ...rule }}>
            {posterDataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterDataUri}
                alt=""
                width={220}
                height={320}
                style={{ objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  width: 220,
                  height: 320,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', fontSize: 12, letterSpacing: 3, opacity: 0.2 }}>포스터 없음</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
              <div style={{ display: 'flex', fontSize: 36, letterSpacing: 2, opacity: 0.92 }}>{movie?.title ?? ''}</div>
              <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, opacity: 0.45 }}>
                {movie ? `${movie.year} · ${movie.director}` : ''}
              </div>

              <div style={{ display: 'flex', gap: 28, fontSize: 15, opacity: 0.55, marginTop: 4 }}>
                {watchedAt && <div style={{ display: 'flex' }}>{watchedAt}</div>}
                {movie?.rating != null && <div style={{ display: 'flex', fontSize: 17 }}>{ratingDots(movie.rating)}</div>}
                {rewatchCount > 0 && <div style={{ display: 'flex' }}>{rewatchCount}회 다시 봄</div>}
              </div>

              {noteText && (
                <div style={{ display: 'flex', maxWidth: 640, fontSize: 16, lineHeight: 1.5, opacity: 0.5, marginTop: 4 }}>
                  {noteText}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 44px' }}>
            <div style={{ display: 'flex', fontSize: 13, letterSpacing: 9, opacity: 0.25 }}>CINELOG</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' }] : undefined,
    },
  )
}
