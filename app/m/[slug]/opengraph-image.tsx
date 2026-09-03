import { ImageResponse } from 'next/og'
import { fetchCardMovie } from './_data'

export const runtime = 'nodejs'
export const alt = '영화 카드'
export const size = { width: 1080, height: 1350 }
export const contentType = 'image/png'

function ratingLine(rating: number | undefined): string {
  if (rating == null) return ''
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

// 고정 크기 캔버스라 스크롤이 없다 — 이 사진은 요약용 미리보기일 뿐이고, 전체
// 감상 이력은 이 이미지가 링크하는 웹페이지(page.tsx)에서 한 장씩 넘겨볼 수
// 있다(ViewingHistoryStepper). 그래서 여기서는 넘치지 않을 만큼만 짧게 자른다.
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

// Satori(next/og)의 기본 폰트는 한글 글리프가 없다 — 제목/감독이 전부 한글이라
// 폰트를 직접 안 실어주면 글자가 안 뜨거나 깨진다. Google Fonts의 CSS2 API에
// text= 파라미터를 주면 실제로 쓰는 글자만 담긴 가벼운 폰트 파일을 받을 수 있다.
// 네트워크 요청이 실패해도(오프라인 등) 카드 생성 자체가 죽지 않도록 실패하면
// 조용히 기본 폰트로 넘어간다 — 한글이 안 보일 수는 있어도 이미지 자체는 뜬다.
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
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
async function loadPosterDataUri(posterPath: string): Promise<string | null> {
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

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const movie = await fetchCardMovie(slug)
  const posterDataUri = movie?.posterPath ? await loadPosterDataUri(movie.posterPath) : null

  const noteText = movie?.note ? truncate(movie.note, 60) : ''
  // 감상의 연혁은 이 사진에서 항목별로 보여주지 않는다(고정 크기라 넘치면 잘리니까)
  // — "몇 번 다시 봤는지"만 짧게 알려주고, 전체 이력은 링크된 웹페이지에서 본다.
  const rewatchCount = Math.max(0, (movie?.viewings?.length ?? 0) - 1)

  // 폰트 서브셋 요청에는 화면에 실제로 찍히는 문자열을 그대로 다 넣어야 한다 —
  // 제목/메모만 넣고 별점(★☆)이나 가운뎃점(·), 인용부호(" "), 연도 숫자를
  // 빠뜨리면 그 글자들은 폰트에 아예 없어서 이미지에서 안 보이거나 깨진다.
  const text = [
    movie?.title ?? '',
    movie ? `${movie.year} · ${movie.director}` : '',
    movie?.rating != null ? ratingLine(movie.rating) : '',
    noteText ? `“${noteText}”` : '',
    `${rewatchCount}번 다시 봄`,
    'CINELOG',
  ].join('')

  const fontData = await loadKoreanFont(text)
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
          padding: '90px 70px',
          fontFamily,
        }}
      >
        <div />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {posterDataUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterDataUri} alt="" width={300} height={450} style={{ objectFit: 'cover' }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 44, letterSpacing: 3, opacity: 0.92 }}>{movie?.title ?? ''}</div>
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, opacity: 0.45 }}>
              {movie ? `${movie.year} · ${movie.director}` : ''}
            </div>
          </div>

          {movie?.rating != null && (
            <div style={{ display: 'flex', fontSize: 30, letterSpacing: 10, opacity: 0.7 }}>{ratingLine(movie.rating)}</div>
          )}

          {noteText && (
            <div style={{ display: 'flex', maxWidth: 640, fontSize: 19, opacity: 0.55, textAlign: 'center' }}>
              “{noteText}”
            </div>
          )}

          {rewatchCount > 0 && (
            <div style={{ display: 'flex', fontSize: 16, letterSpacing: 4, opacity: 0.3 }}>{rewatchCount}번 다시 봄</div>
          )}
        </div>

        <div style={{ display: 'flex', fontSize: 16, letterSpacing: 10, opacity: 0.25 }}>CINELOG</div>
      </div>
    ),
    {
      ...size,
      fonts: fontData ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' }] : undefined,
    },
  )
}
