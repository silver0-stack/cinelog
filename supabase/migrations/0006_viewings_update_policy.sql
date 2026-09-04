-- viewings에는 select/insert/delete_own만 있고 update 정책이 없었다 — 잘못 입력한
-- 평점/한줄메모/감상일을 고칠 방법이 아예 없었다는 뜻이다. "다시 봤어"를 눌러
-- 실수로 잘못 남긴 감상을 고칠 수 있어야 한다는 피드백으로 추가한다.
create policy "viewings_update_own" on viewings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
