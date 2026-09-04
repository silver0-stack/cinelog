-- 공유 읽기 재설계. 0002~0004에서 만든 "공유 켠 유저의 행은 누구나 select 가능"
-- 정책들은 익명 방문자용으로 만든 거였는데, "누가 묻는지"는 안 따지고 "행 주인이
-- 공유를 켰는지"만 따져서 로그인한 다른 유저의 무필터 쿼리에도 그대로 새어
-- 들어갔다(A가 공유를 켜면 A의 우주가 서비스의 모든 유저 화면에 섞여 보이는
-- 버그로 이어짐). 이 마이그레이션은 그 permissive 정책들을 테이블에서 완전히
-- 제거하고, 대신 slug 하나로 딱 필요한 범위만 돌려주는 SECURITY DEFINER 함수를
-- 통해서만 공개 읽기를 허용한다 — 앞으로 어떤 쿼리가 user_id 필터를 깜빡하더라도
-- RLS가 "본인 것만"으로 항상 막아준다.

drop policy if exists "logged_movies_select_shared" on logged_movies;
drop policy if exists "viewings_select_shared" on viewings;
drop policy if exists "editorial_connections_select_shared" on editorial_connections;
drop policy if exists "logged_movies_select_card_shared" on logged_movies;
drop policy if exists "viewings_select_card_shared" on viewings;

-- 우주 전체 공유(/u/[slug]).
create or replace function get_shared_universe_movies(p_slug text)
returns table (
  id uuid, tmdb_id integer, title text, year integer, director text,
  genres text[], themes text[], moods text[], poster_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select lm.id, lm.tmdb_id, lm.title, lm.year, lm.director, lm.genres, lm.themes, lm.moods, lm.poster_path
  from logged_movies lm
  join share_links sl on sl.user_id = lm.user_id
  where sl.slug = p_slug;
$$;

create or replace function get_shared_universe_viewings(p_slug text)
returns table (
  id uuid, logged_movie_id uuid, rating smallint, note text, watched_at date
)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.logged_movie_id, v.rating, v.note, v.watched_at
  from viewings v
  join share_links sl on sl.user_id = v.user_id
  where sl.slug = p_slug;
$$;

create or replace function get_shared_universe_connections(p_slug text)
returns table (
  movie_a_id uuid, movie_b_id uuid, strength real
)
language sql
security definer
set search_path = public
stable
as $$
  select ec.movie_a_id, ec.movie_b_id, ec.strength
  from editorial_connections ec
  join share_links sl on sl.user_id = ec.user_id
  where sl.slug = p_slug;
$$;

-- 영화 카드 한 장 공유(/m/[slug]). 우주 전체와 무관하게 그 영화 한 편 + 그 영화의
-- 감상 기록만 노출한다(0004의 좁은 공개 범위를 그대로 유지).
create or replace function get_shared_movie_card(p_slug text)
returns table (
  id uuid, tmdb_id integer, title text, year integer, director text,
  genres text[], themes text[], moods text[], poster_path text
)
language sql
security definer
set search_path = public
stable
as $$
  select lm.id, lm.tmdb_id, lm.title, lm.year, lm.director, lm.genres, lm.themes, lm.moods, lm.poster_path
  from logged_movies lm
  join movie_share_links msl on msl.logged_movie_id = lm.id
  where msl.slug = p_slug;
$$;

create or replace function get_shared_movie_card_viewings(p_slug text)
returns table (
  id uuid, logged_movie_id uuid, rating smallint, note text, watched_at date
)
language sql
security definer
set search_path = public
stable
as $$
  select v.id, v.logged_movie_id, v.rating, v.note, v.watched_at
  from viewings v
  join movie_share_links msl on msl.logged_movie_id = v.logged_movie_id
  where msl.slug = p_slug;
$$;

revoke all on function get_shared_universe_movies(text) from public;
revoke all on function get_shared_universe_viewings(text) from public;
revoke all on function get_shared_universe_connections(text) from public;
revoke all on function get_shared_movie_card(text) from public;
revoke all on function get_shared_movie_card_viewings(text) from public;

grant execute on function get_shared_universe_movies(text) to anon, authenticated;
grant execute on function get_shared_universe_viewings(text) to anon, authenticated;
grant execute on function get_shared_universe_connections(text) to anon, authenticated;
grant execute on function get_shared_movie_card(text) to anon, authenticated;
grant execute on function get_shared_movie_card_viewings(text) to anon, authenticated;
