-- STEP 19: 비동기 공유 링크(P2-8). 실시간 프레즌스가 아니라 "링크 하나로 읽기 전용
-- 공개"다. slug를 아는 사람만 볼 수 있는 unlisted 링크로, 비밀번호 보호는 없다.
create table if not exists share_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null,
  created_at timestamptz not null default now()
);

alter table share_links enable row level security;

-- slug로 owner를 찾아야 하는 익명 방문자를 위해 조회는 완전히 공개한다 —
-- slug 자체가 짐작하기 어려운 무작위 문자열이라는 게 유일한 보호 장치다.
create policy "share_links_select_all" on share_links
  for select using (true);

create policy "share_links_insert_own" on share_links
  for insert with check (auth.uid() = user_id);

create policy "share_links_delete_own" on share_links
  for delete using (auth.uid() = user_id);

-- 공유를 켠 유저의 기록/관계는 로그인 없이도 읽을 수 있어야 공유 링크가 의미가
-- 있다. 기존 "본인 것만" 정책에 이 정책을 추가한다(같은 select에 여러 정책이
-- 있으면 OR로 합쳐진다) — 쓰기 권한에는 영향 없다.
create policy "logged_movies_select_shared" on logged_movies
  for select using (
    exists (select 1 from share_links sl where sl.user_id = logged_movies.user_id)
  );

create policy "editorial_connections_select_shared" on editorial_connections
  for select using (
    exists (select 1 from share_links sl where sl.user_id = editorial_connections.user_id)
  );
