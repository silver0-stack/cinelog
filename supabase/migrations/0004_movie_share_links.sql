-- 영화 카드 한 장 공유(트위터 링크 붙여넣기, 인스타스토리 PNG). 우주 전체 공유
-- (share_links)와 완전히 독립적인 slug를 쓴다 — 카드 링크 하나만 받은 사람이
-- 거기서 우주 전체 slug를 유추/접근할 수 있으면 안 되기 때문이다("영화 하나만
-- 자랑하고 싶었는데 내 다이어리 전체가 노출된다"는 문제를 피한다).

create table if not exists movie_share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_movie_id uuid not null references logged_movies(id) on delete cascade unique,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists movie_share_links_user_id_idx on movie_share_links (user_id);

alter table movie_share_links enable row level security;

-- slug로 카드를 찾아야 하는 익명 방문자를 위해 조회는 완전히 공개한다(0002의
-- share_links와 같은 패턴) — slug 자체가 무작위 문자열이라는 게 유일한 보호.
create policy "movie_share_links_select_all" on movie_share_links
  for select using (true);

create policy "movie_share_links_insert_own" on movie_share_links
  for insert with check (auth.uid() = user_id);

create policy "movie_share_links_delete_own" on movie_share_links
  for delete using (auth.uid() = user_id);

-- 카드 slug가 있는 "그 영화 한 편"과 "그 영화의 감상 기록"만 로그인 없이 읽을 수
-- 있다 — 우주 전체 공유(share_links)와는 별도의, 더 좁은 공개 범위다.
create policy "logged_movies_select_card_shared" on logged_movies
  for select using (
    exists (select 1 from movie_share_links msl where msl.logged_movie_id = logged_movies.id)
  );

create policy "viewings_select_card_shared" on viewings
  for select using (
    exists (select 1 from movie_share_links msl where msl.logged_movie_id = viewings.logged_movie_id)
  );
