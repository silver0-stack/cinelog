// V2 영화 기록 시 사용하는 고정 장르 칩 목록 (P2-3). TMDB 장르 id와 매핑해서
// 검색으로 등록할 때 자동으로 채워주고, 수동 입력일 때는 이 목록에서 유저가 직접 고른다.
// gravity 계산(lib/gravity.ts)은 문자열 그대로 비교하므로 여기 라벨이 곧 저장값이다.
export const GENRE_CHIPS = [
  '액션',
  '애니메이션',
  '코미디',
  '범죄',
  '다큐멘터리',
  '드라마',
  '가족',
  '판타지',
  '공포',
  '음악',
  '미스터리',
  '로맨스',
  'SF',
  '스릴러',
] as const

export type GenreChip = (typeof GENRE_CHIPS)[number]

const TMDB_GENRE_ID_TO_CHIP: Record<number, GenreChip> = {
  28: '액션', // Action
  12: '액션', // Adventure
  16: '애니메이션', // Animation
  35: '코미디', // Comedy
  80: '범죄', // Crime
  99: '다큐멘터리', // Documentary
  18: '드라마', // Drama
  36: '드라마', // History
  10752: '드라마', // War
  10751: '가족', // Family
  14: '판타지', // Fantasy
  27: '공포', // Horror
  10402: '음악', // Music
  9648: '미스터리', // Mystery
  10749: '로맨스', // Romance
  878: 'SF', // Science Fiction
  53: '스릴러', // Thriller
}

export function mapTmdbGenreIds(ids: number[]): GenreChip[] {
  const chips = new Set<GenreChip>()
  for (const id of ids) {
    const chip = TMDB_GENRE_ID_TO_CHIP[id]
    if (chip) chips.add(chip)
  }
  return [...chips]
}
