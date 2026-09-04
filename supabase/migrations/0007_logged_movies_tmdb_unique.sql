-- 같은 유저가 같은 TMDB 영화를 두 번 기록하면 우주에 같은 영화가 별 두 개로
-- 따로 뜬다 — "다시 봤다"는 새 logged_movies 행이 아니라 기존 기록에 viewings를
-- 쌓는 방식(정보 수정 패널의 "다시 본 감상 남기기")으로 이미 지원되는데, 그
-- 경로를 안 타면 이 상태가 됐다. 클라이언트(LogMovieForm)에서 검색 시점에
-- 막지만, 동시 탭/재시도 같은 경쟁 상태까지 막으려면 DB 레벨 제약이 필요하다.
--
-- 수기 입력(tmdb_id가 없는 기록)은 대상에서 제외한다 — TMDB에 없는 영화까지
-- 제목만으로 중복 판정하면 오탐이 너무 많다.
create unique index if not exists logged_movies_user_tmdb_unique
  on logged_movies (user_id, tmdb_id)
  where tmdb_id is not null;
