-- STEP 12: 로그인 유저의 영화 기록(LoggedMovie)과 editorial connection 스키마.
-- V1 정적 유니버스(data/movies.ts)와는 별개 데이터 소스 — 여기는 손대지 않는다.

create table if not exists logged_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  tmdb_id integer,
  title text not null,
  year integer not null,
  director text,

  genres text[] not null default '{}',
  themes text[] not null default '{}',
  moods text[] not null default '{}',

  poster_path text,
  rating smallint check (rating between 0 and 5),
  note text,
  watched_at date not null default current_date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logged_movies_user_id_idx on logged_movies (user_id);

-- 드래그로 조정하는 editorial connection (P2-6). 각도(순번)는 코드에서 고정,
-- 여기서는 반지름(strength)만 유저별로 저장한다.
create table if not exists editorial_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_a_id uuid not null references logged_movies(id) on delete cascade,
  movie_b_id uuid not null references logged_movies(id) on delete cascade,
  strength real not null check (strength between 0 and 1),
  updated_at timestamptz not null default now(),
  unique (user_id, movie_a_id, movie_b_id),
  check (movie_a_id <> movie_b_id)
);

create index if not exists editorial_connections_user_id_idx on editorial_connections (user_id);

-- updated_at 자동 갱신
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger logged_movies_set_updated_at
  before update on logged_movies
  for each row execute function set_updated_at();

create trigger editorial_connections_set_updated_at
  before update on editorial_connections
  for each row execute function set_updated_at();

-- RLS: 로그인한 본인 소유 행만 조회/추가/수정/삭제 가능
alter table logged_movies enable row level security;
alter table editorial_connections enable row level security;

create policy "logged_movies_select_own" on logged_movies
  for select using (auth.uid() = user_id);

create policy "logged_movies_insert_own" on logged_movies
  for insert with check (auth.uid() = user_id);

create policy "logged_movies_update_own" on logged_movies
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "logged_movies_delete_own" on logged_movies
  for delete using (auth.uid() = user_id);

create policy "editorial_connections_select_own" on editorial_connections
  for select using (auth.uid() = user_id);

create policy "editorial_connections_insert_own" on editorial_connections
  for insert with check (auth.uid() = user_id);

create policy "editorial_connections_update_own" on editorial_connections
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "editorial_connections_delete_own" on editorial_connections
  for delete using (auth.uid() = user_id);
