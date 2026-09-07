-- 자유 텍스트 배치. 별자리(선으로 잇기)를 실제로 만들어 검증한 뒤, "선은 결국
-- 거미줄이 된다"는 문제 제기로 완전히 다른 방향으로 바꿨다(CLAUDE.md 2026-09-07
-- 참고) — 이름 붙은 관계를 DB에 저장하는 대신, 우주 아무 데나 자유롭게 놓을 수
-- 있는 텍스트 오브젝트 하나만 둔다. 영화를 한데 모으고 싶으면 이미 있는 자유
-- 드래그 배치(logged_movies.pos_x/pos_y)를 쓰고, 거기에 이름을 붙이고 싶으면
-- 이 텍스트를 근처에 놓는다 — "그룹"이라는 관계 자체는 DB에 없고 순전히 공간
-- 배치로만 표현된다.

-- 0009에서 만든 별자리 전용 스키마를 걷어낸다 — 코드에서 이미 완전히 뺐고
-- (constellations/constellation_movies/get_shared_universe_constellations를
-- 쓰는 곳이 하나도 없다), 이 DB에는 0009가 이미 실행돼 남아있어서 여기서 같이
-- 정리한다. constellation_movies가 constellations를 참조하므로 먼저 지운다.
drop function if exists get_shared_universe_constellations(text);
drop table if exists constellation_movies;
drop table if exists constellations;

create table if not exists universe_texts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  pos_x double precision not null,
  pos_y double precision not null,
  size double precision not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universe_texts_user_id_idx on universe_texts (user_id);

create trigger universe_texts_set_updated_at
  before update on universe_texts
  for each row execute function set_updated_at();

alter table universe_texts enable row level security;

create policy "universe_texts_select_own" on universe_texts
  for select using (auth.uid() = user_id);

create policy "universe_texts_insert_own" on universe_texts
  for insert with check (auth.uid() = user_id);

create policy "universe_texts_update_own" on universe_texts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "universe_texts_delete_own" on universe_texts
  for delete using (auth.uid() = user_id);

-- 공유 우주(/u/[slug])에서도 읽기 전용으로 보인다 — get_shared_universe_movies(0005)와 같은 패턴.
create function get_shared_universe_texts(p_slug text)
returns table (
  id uuid, content text, pos_x double precision, pos_y double precision, "size" double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.content, t.pos_x, t.pos_y, t.size
  from universe_texts t
  join share_links sl on sl.user_id = t.user_id
  where sl.slug = p_slug;
$$;

revoke all on function get_shared_universe_texts(text) from public;
grant execute on function get_shared_universe_texts(text) to anon, authenticated;
