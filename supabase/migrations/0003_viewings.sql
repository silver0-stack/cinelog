-- 회고를 "덮어쓰기"가 아니라 "다시 본 기록의 연혁"으로 남긴다. 평점/한줄메모/감상일은
-- 더 이상 logged_movies(작품 자체)에 붙지 않는다 — 같은 영화를 다시 보고 감상이
-- 달라졌을 때 이전 감상을 지우지 않고 새 감상을 쌓을 수 있어야 하기 때문이다.
-- logged_movies는 이제 "무엇을 봤는가"(작품 메타데이터)만 담고, viewings가
-- "언제 어떻게 느꼈는가"(감상 하나하나)를 담는다.

create table if not exists viewings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_movie_id uuid not null references logged_movies(id) on delete cascade,
  rating smallint check (rating between 0 and 5),
  note text,
  watched_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists viewings_logged_movie_id_idx on viewings (logged_movie_id);
create index if not exists viewings_user_id_idx on viewings (user_id);

-- 기존에는 logged_movies 한 행 = 감상 하나였다. 그 감상을 각 영화의 첫 viewing으로 옮긴다.
insert into viewings (user_id, logged_movie_id, rating, note, watched_at)
select user_id, id, rating, note, watched_at from logged_movies;

alter table logged_movies drop column rating;
alter table logged_movies drop column note;
alter table logged_movies drop column watched_at;

alter table viewings enable row level security;

create policy "viewings_select_own" on viewings
  for select using (auth.uid() = user_id);

create policy "viewings_insert_own" on viewings
  for insert with check (auth.uid() = user_id);

create policy "viewings_delete_own" on viewings
  for delete using (auth.uid() = user_id);

-- 공유 링크를 켠 유저의 감상 기록도 로그인 없이 읽을 수 있어야 한다(0002와 같은 패턴).
create policy "viewings_select_shared" on viewings
  for select using (
    exists (select 1 from share_links sl where sl.user_id = viewings.user_id)
  );
