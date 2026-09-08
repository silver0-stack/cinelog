import { createClient } from '@/lib/supabase/client'

export type UniverseText = { id: string; content: string; x: number; y: number; size: number }

type UniverseTextRow = { id: string; content: string; pos_x: number; pos_y: number; size: number }

export function combineUniverseTexts(rows: UniverseTextRow[]): UniverseText[] {
  return rows.map((row) => ({ id: row.id, content: row.content, x: row.pos_x, y: row.pos_y, size: row.size }))
}

// id는 서버가 아니라 호출부(MovieUniverse)가 crypto.randomUUID()로 미리 만들어
// 넘긴다 — 데모 게스트 평점/메모가 로컬 id를 미리 만드는 것과 같은 기법
// (MoviePeekPanel.tsx의 onGuestMutate 콜백들 참고). 그래야 서버 응답을 기다리지
// 않고 그 자리에서 바로 타이핑을 시작할 수 있다 — 이 요청은 백그라운드로 보내고
// 실패해도(로그인 안 됨 등) 콘솔에만 로그를 남긴다(updateMoviePosition과 같은 패턴).
export async function createUniverseText(id: string, content: string, x: number, y: number, size: number): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')

  const { error } = await supabase
    .from('universe_texts')
    .insert({ id, user_id: user.id, content, pos_x: x, pos_y: y, size })

  if (error) throw error
}

/** 드래그(위치)/리사이즈(크기) 커밋 시 호출 — updateMoviePosition과 같은 패턴. */
export async function updateUniverseTextTransform(id: string, x: number, y: number, size: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('universe_texts').update({ pos_x: x, pos_y: y, size }).eq('id', id)
  if (error) throw error
}

/** 편집 모드에서 블러할 때(내용이 바뀌었으면) 호출한다. */
export async function updateUniverseTextContent(id: string, content: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('universe_texts').update({ content }).eq('id', id)
  if (error) throw error
}

/** 편집 후 내용이 비어 있으면 자동으로 지운다 — 별도 삭제 버튼을 안 두는 대신. */
export async function deleteUniverseText(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('universe_texts').delete().eq('id', id)
  if (error) throw error
}
