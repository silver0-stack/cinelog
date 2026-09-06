import type { Movie } from '@/data/movies'

// MovieUniverse와 MovieBody가 함께 알아야 하는 배치 상수.
// (2026-09-06) 겹침 완화 패스(MovieUniverse의 relaxPositions)를 추가하면서
// 90~420 반지름 범위가 너무 좁다는 게 드러났다 — 관계가 강한 영화가 여럿이면
// 다들 반지름 90 근처로 몰리는데, 그 근처 둘레(2π×90≈565px)로는 최소 간격
// (130px)을 지키며 4~5편도 못 담아서 완화 패스가 원래 반지름 의미를 크게
// 뭉갤 수밖에 없었다. 전체적으로 더 넉넉하게 넓힌다.
export const MIN_RADIUS = 110
export const MAX_RADIUS = 620

// 카메라 줌 배율의 하한/상한. MovieBody가 줌 구간별로 메타 정보/포스터를
// 단계적으로 감추는 애니메이션(별로 수렴)의 기준점을 잡는 데도 이 값이 필요하다.
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 10

// (2026-09-06) "관계 기반 반지름"만으로는 이웃한 두 별이 실제로 서로 관련
// 있다는 보장이 없다는 피드백 — 각도가 골든 앵글(영화 id 순번)이라 완전히
// 무작위였기 때문이다(라라랜드와 파묘가 우연히 붙어 있는데 실제로는 무관한
// 사례). 각도 자체를 장르로 묶어서, 같은 장르를 공유하는 영화들이 반드시
// 같은 방향(부채꼴 섹터)에 모이게 한다 — "박찬욱 영화 3편"이 실제로
// 화면에서도 뭉쳐 보이는 걸 물리 시뮬레이션 없이 만든다. 반지름(관계 강도)은
// 그대로 두고 각도 배정 방식만 바꾼 것이라 MIN_RADIUS/MAX_RADIUS/relatedMovies
// 쪽 로직은 전혀 안 건드린다.
//
// 처음엔 장르/감독/시대 중 묶는 기준을 사용자가 고를 수 있게 했었는데, 드래그로
// 직접 배치하는 기능이 생기면서 이 자동 배치는 "직접 정하기 전 기본값"으로
// 역할이 바뀌었다 — 기본값의 기준까지 매번 고민하게 만들 이유가 없어서 장르
// 하나로 고정했다(2026-09-06).
function clusterKey(movie: Movie): string {
  return movie.genres[0] || '기타'
}

/**
 * movie.id → 각도(라디안) 맵을 만든다. 같은 클러스터 키(장르)를 가진 영화들은
 * 자기 섹터 안에서만 각도를 배정받는다 — 섹터 경계를 넘어가는 일이 없어서,
 * 같은 장르를 공유하는 영화들은 항상 시각적으로 뭉쳐 보인다.
 *
 * (2026-09-06) 처음엔 섹터를 클러스터 수로 균등 분할했는데, 실사용 데이터로
 * 보니 멤버가 많은 클러스터(예: "드라마" 장르에 걸린 영화 10편)가 멤버 1개
 * 짜리 클러스터와 똑같은 좁은 부채꼴을 배정받아 포스터가 서로 겹쳐 쌓이는
 * 문제가 있었다 — 게다가 같은 클러스터는 서로 관계가 강해 반지름도 비슷하게
 * 작아지는 경향이 있어서(짧은 호 길이) 겹침이 더 심해졌다. 섹터 크기를
 * "그 클러스터에 속한 영화 수"에 비례하게 배정해서, 멤버가 많을수록 실제로
 * 더 넓게 펼쳐질 공간을 준다.
 */
export function clusterAngles(movies: Movie[]): Map<string, number> {
  const groups = new Map<string, Movie[]>()
  for (const movie of movies) {
    const key = clusterKey(movie)
    const list = groups.get(key) ?? []
    list.push(movie)
    groups.set(key, list)
  }

  const keys = [...groups.keys()].sort()
  const total = movies.length || 1
  const angles = new Map<string, number>()

  let cursor = 0
  for (const key of keys) {
    const members = groups.get(key)!.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const sectorSize = (members.length / total) * Math.PI * 2
    const sectorStart = cursor
    cursor += sectorSize
    // 섹터 가장자리에 딱 붙으면 옆 섹터와 시각적으로 헷갈릴 수 있어 약간 여백을 둔다.
    const margin = sectorSize * 0.12
    const usable = Math.max(sectorSize - margin * 2, 0)
    members.forEach((movie, i) => {
      const t = members.length === 1 ? 0.5 : i / (members.length - 1)
      angles.set(movie.id, sectorStart + margin + t * usable)
    })
  }

  return angles
}
