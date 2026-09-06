-- (2026-09-06) "우주를 자동으로 배치하는 것"과 "유저가 직접 배치하는 것" 사이의
-- 논의 끝에, 완전 자동(관계 기반)에서 "기본값은 자동, 드래그하면 그 위치가
-- 영구히 고정 저장된다"로 바꾸기로 했다 — 객관적 메타데이터(감독/장르)로는
-- 잡을 수 없는 지극히 개인적인 연결("나한텐 이 영화가 저 영화 옆에 있어야
-- 한다")을 표현할 방법이 필요하다는 이유. pos_x/pos_y가 둘 다 null이면
-- "아직 한 번도 안 옮긴 영화" — 코드에서 기존 자동 배치(관계 강도 + 장르/감독/
-- 시대 클러스터)로 기본 위치를 계산해 보여준다. 값이 있으면 그 좌표를 그대로,
-- 다시는 자동으로 움직이지 않는다.
alter table logged_movies
  add column if not exists pos_x double precision,
  add column if not exists pos_y double precision;

-- 공유 우주(/u/[slug])를 보는 사람도 주인이 손으로 배치한 그대로 봐야 한다 —
-- RPC 반환 컬럼에 pos_x/pos_y를 추가한다. PostgreSQL은 테이블 함수의 반환
-- 컬럼 구성을 CREATE OR REPLACE만으로 바꿀 수 없어 먼저 DROP한다.
drop function if exists get_shared_universe_movies(text);

create function get_shared_universe_movies(p_slug text)
returns table (
  id uuid, tmdb_id integer, title text, year integer, director text,
  genres text[], themes text[], moods text[], poster_path text,
  pos_x double precision, pos_y double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select lm.id, lm.tmdb_id, lm.title, lm.year, lm.director, lm.genres, lm.themes, lm.moods, lm.poster_path,
         lm.pos_x, lm.pos_y
  from logged_movies lm
  join share_links sl on sl.user_id = lm.user_id
  where sl.slug = p_slug;
$$;

revoke all on function get_shared_universe_movies(text) from public;
grant execute on function get_shared_universe_movies(text) to anon, authenticated;
